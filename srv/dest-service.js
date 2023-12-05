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
    const data = req.data ? req.data.requestBody : null;
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
    } catch (e) {
        console.log("# Error while callDestination: "+e);
        if ( e.reason ) {
            // replace all new line characters so we can send message in header
            let sReason = JSON.stringify(e.reason).replace(/\r?\n|\r/g,'');
            req._.res.setHeader('srv-err-reason-json', sReason);
            if ( e.reason.response ) {
                let sResponse = JSON.stringify(e.reason.response).replace(/\r?\n|\r/g,'');
                req._.res.setHeader('srv-err-response-json', sResponse);
            }
        }
        throw e; // trigger exception handling - so the error detail can be captured in srv console
    }
    const endTime = new Date().getTime();
    console.log("# callDestination completed, took time: "+(endTime-startTime)+" msecs");
    console.log(ret);
    return ret;
}