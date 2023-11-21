const cds = require('@sap/cds');
const xsenv = require('@sap/xsenv');
xsenv.loadEnv();
const services = xsenv.getServices({
    registry: { tagG: 'SaaS' },
    dest: { tag: 'destination' },
    conn: { tag: "connectivity" }
});
const dependencies = [{ 'xsappname': services.dest.xsappname }, { 'xsappname': services.conn.xsappname }];

cds.on('served', async () => {
    const { 'cds.xt.SaasProvisioningService': provisioning } = cds.services;
    //const { 'cds.xt.DeploymentService': deployment } = cds.services;
    await provisioning.prepend(() => {
        //provisioning.on('UPDATE', 'tenant', async (req, next) => { ... })
        provisioning.on('dependencies', async (req, next) => {
            console.log("mtx dependencies: " + dependencies);
            return dependencies;
        })
    });
    // await deployment.prepend(() => {
    //     // previously this was `upgradeTenant`
    //     deployment.on('upgrade', async (req) => {
    //         // HDI container credentials are not yet available here
    //     });
    //     // previously this was `deployToDb`
    //     deployment.on('deploy', async (req) => {
    //         const { tenant, options: { container } } = req.data

    //     });
    // });
});

module.exports = cds.server;