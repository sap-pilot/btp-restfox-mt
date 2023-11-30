const cds = require('@sap/cds');
const {executeHttpRequest} = require('@sap-cloud-sdk/http-client');
const cfenv = require('cfenv');
const appEnv = cfenv.getAppEnv();

// parameters to determine app hostname for new subscriptions
const APP_NAME = "BTP-Restfox-MT-app"; // local app name the route should bind to, should match mta.yaml approuter name
const CF_API_DESTINATION_NAME = "BTP_CFAPI"; // shared CF API destination name (for all MTE solutions), must match destination name defined in mta.ytaml
const URL_APP_NAME = "btprestfox"; // short app name to identify the app in URL, must match mta.yaml TENANT_HOST_PATTERN
const URL_POSTFIX = "-"+URL_APP_NAME;// + "-" + appEnv.app.space_name.toLowerCase().replace(/_/g,"-");

// services dependencies
const xsenv = require('@sap/xsenv');
xsenv.loadEnv();
const services = xsenv.getServices({
    registry: { tagG: 'SaaS' },
    dest: { tag: 'destination' },
    conn: { tag: "connectivity" }
});
const dependencies = [{ 'xsappname': services.dest.xsappname }, { 'xsappname': services.conn.xsappname }];

cds.on('served', async () => {

    const { 'cds.xt.SaasProvisioningService': provisioning, 'cds.xt.DeploymentService': deployment } = cds.services;

    // return dependencies so xsuaa/destination service can be bound to MTE subscription
    await provisioning.prepend(() => {
        //provisioning.on('UPDATE', 'tenant', async (req, next) => { ... })
        provisioning.on('dependencies', async (req, next) => {
            console.log("mtx dependencies: " + dependencies);
            return dependencies;
        })
    });

    // create route upon subscribing this service
    deployment.before('subscribe', async (req) => {
        // HDI container credentials are not yet available here
        const { tenant, metadata } = req.data;
        let tenantHost = metadata.subscribedSubdomain + URL_POSTFIX;
        let tenantURL = 'https:\/\/' + tenantHost + /\.(.*)/gm.exec(appEnv.app.application_uris[0])[0];
        console.log("Subscribing tenant["+tenant+"], host=["+tenantHost+"], url="+tenantURL);
        //await next();
        createRoute(tenantHost, APP_NAME).then(
            function (res2) {
                console.log('Subscribe: - Create Route: ', metadata.subscribedTenantId, tenantHost, tenantURL);
                return tenantURL;
            },
            function (err) {
                console.log('Error while creatig Route: ', metadata.subscribedTenantId, tenantHost, tenantURL + ": ");
                console.log(err);
                return '';
            });
        return tenantURL;
    });

    deployment.after('unsubscribe', async (result, req) => {
        const { container } = req.data.options;
        const { tenant, metadata } = req.data;
        let tenantHost = metadata.subscribedSubdomain + URL_POSTFIX;
        console.log("Unsubscribing tenant["+tenant+"], host=["+tenantHost+"]");
        deleteRoute(tenantHost, APP_NAME).then(
            async function (res2) {
                console.log('Unsubscribe: - Delete Route: ', metadata.subscribedTenantId);
                return metadata.subscribedTenantId;
            },
            function (err) {
                console.log('Error while deleting Route: ', metadata.subscribedTenantId, tenantHost, tenantURL + ": ");
                console.log(err);
                return '';
            });
        return metadata.subscribedTenantId;
    });
});


// helper function to getCFInfo
async function getCFInfo(appname) {
    try {
        // get app GUID
        console.log("appEnv=" + JSON.stringify(appEnv.app));
        console.log("getCFInfo from destination:'" + CF_API_DESTINATION_NAME + "', organizationGuid:'" + appEnv.app.organization_id + "', space_guids='" + appEnv.app.space_id + "', names='" + appname + "'");
        let res1 = await executeHttpRequest({destinationName:CF_API_DESTINATION_NAME}, {
            method: 'GET',
            url: '/v3/apps?organization_guids=' + appEnv.app.organization_id + '&space_guids=' + appEnv.app.space_id + '&names=' + appname
        });
        // get domain GUID
        let res2 = await executeHttpRequest({destinationName:CF_API_DESTINATION_NAME}, {
            method: 'GET',
            url: '/v3/domains?names=' + /\.(.*)/gm.exec(appEnv.app.application_uris[0])[1]
        });
        console.log("GET apps res1=" + JSON.stringify(res1.data));
        console.log("GET domains res2=" + JSON.stringify(res2.data));
        let results = {
            'app_id': res1.data.resources[0].guid,
            'domain_id': res2.data.resources[0].guid
        };
        return results;
    } catch (err) {
        console.log(err.stack);
        return err.message;
    }
};

// helper function to create tenantHost
async function createRoute(tenantHost, appname) {
    getCFInfo(appname).then(
        async function (CFInfo) {
            try {
                // create route
                let res1 = await executeHttpRequest({destinationName:CF_API_DESTINATION_NAME}, {
                    method: 'POST',
                    url: '/v3/routes',
                    data: {
                        'host': tenantHost,
                        'relationships': {
                            'space': {
                                'data': {
                                    'guid': appEnv.app.space_id
                                }
                            },
                            'domain': {
                                'data': {
                                    'guid': CFInfo.domain_id
                                }
                            }
                        }
                    },
                });
                // map route to app
                let res2 = await executeHttpRequest({destinationName:CF_API_DESTINATION_NAME}, {
                    method: 'POST',
                    url: '/v3/routes/' + res1.data.guid + '/destinations',
                    data: {
                        'destinations': [{
                            'app': {
                                'guid': CFInfo.app_id
                            }
                        }]
                    },
                });
                console.log('Route created for ' + tenantHost);
                return res2.data;
            } catch (err) {
                console.log(err.stack);
                return err.message;
            }
        },
        function (err) {
            console.log(err.stack);
            return err.message;
        });
};

// helper function to delelteRoute
async function deleteRoute(tenantHost, appname) {
    getCFInfo(appname).then(
        async function (CFInfo) {
            try {
                // get route id
                let res1 = await executeHttpRequest({destinationName:CF_API_DESTINATION_NAME}, {
                    method: 'GET',
                    url: '/v3/apps/' + CFInfo.app_id + '/routes?hosts=' + tenantHost
                });
                if (res1.data.pagination.total_results === 1) {
                    try {
                        // delete route
                        let res2 = await executeHttpRequest({destinationName:CF_API_DESTINATION_NAME}, {
                            method: 'DELETE',
                            url: '/v3/routes/' + res1.data.resources[0].guid
                        });
                        console.log('Route deleted for ' + tenantHost);
                        return res2.data;
                    } catch (err) {
                        console.log(err.stack);
                        return err.message;
                    }
                } else {
                    let errmsg = { 'error': 'Route not found' };
                    console.log(errmsg);
                    return errmsg;
                }
            } catch (err) {
                console.log(err.stack);
                return err.message;
            }
        },
        function (err) {
            console.log(err.stack);
            return err.message;
        });
};

module.exports = cds.server;