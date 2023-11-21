const cds = require('@sap/cds');
const {resolveDestination} = require('@sap-pilot/btp-util')

console.log('node version [%s]', process.version);

module.exports = cds.service.impl(srv => {
    srv.on('getDestination', callDestination);
    srv.on('postDestination', callDestination);
});

const callDestination = async (req) => {
    const startTime = new Date().getTime();
    const userId = req.user.id;
    const uri = req.req.query.uri;
    const dest = req.req.query.dest;
    const method = req.req.query.method;
    console.log("# callDestination, userId="+userId+",dest="+dest+",method="+method+",uri="+uri);
    // call actual backend   
    req.req.query.destOverrides = "BTP_DUMMY|"+dest;
    let result = null;
    const service = await cds.connect.to(resolveDestination(req,"BTP_DUMMY"));
    if (method === 'post' || method === 'POST') {
        result = await service.tx(req).post(uri); 
    } else {
        result = await service.tx(req).get(uri); // only support POST and GET for now
    }
    const ret = JSON.stringify(result || {})
    // end of the call
    const endTime = new Date().getTime();
    console.log(ret);
    console.log("# callDestination completed, took time: "+(endTime-startTime)+" msecs");
    return ret;
}