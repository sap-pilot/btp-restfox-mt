const cds = require('@sap/cds');
const {resolveDestination} = require('@sap-pilot/btp-util')

console.log('node version [%s]', process.version);

module.exports = cds.service.impl(srv => {
    srv.on('proxy', callDestination);
});

const callDestination = async (req) => {
    const startTime = new Date().getTime();
    const userId = req.user.id;
    const proxyHeaders = req.headers;
    const data = req.data;
    const uri = proxyHeaders['x-proxy-req-uri'];
    const dest = proxyHeaders['x-proxy-req-dest'];
    const method = proxyHeaders['x-proxy-req-method'];
    console.log("# callDestination, userId="+userId+",dest="+dest+",method="+method+",uri="+uri);
    // construct headers
    const headers = [];
    const headerPrefix = 'x-proxy-req-header-';
    for (const headerKey in proxyHeaders) {
       if ( headerKey && headerKey.startsWith(headerPrefix) ) {
            headers[headerKey.substring(headerPrefix.length)] = proxyHeaders[headerKey];
       }
    }
    // specify destination override
    req.req.query.destOverrides = "BTP_DUMMY|"+dest;
    // call actual backend   
    const service = await cds.connect.to(resolveDestination(req,"BTP_DUMMY"));
    const query = {query: method+ ' ' + uri, data: data, headers: headers};
    console.log(JSON.stringify(query));
    let ret = null;
    try {
        ret = await service.send(query);
    }
    catch (e) {
        console.log("# Error while callDestination: "+e);
        if ( e.response ) {
            req._.res.setHeader('srv-response', e.response);
        }
        throw e;
    }
    const endTime = new Date().getTime();
    console.log("# callDestination completed, took time: "+(endTime-startTime)+" msecs");
    console.log(ret);
    return ret;
}