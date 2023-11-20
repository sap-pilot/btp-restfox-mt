const cds = require('@sap/cds');
const {resolveDestination} = require('@sap-pilot/btp-util')

console.log('node version [%s]', process.version);

module.exports = cds.service.impl(srv => {
    srv.on('call', callBackend);
});

const callBackend = async (req) => {
    const startTime = new Date().getTime();
    const userId = req.user.id;
    const uri = req.query.uri;
    const dest = req.query.dest;
    console.log("# callBackend, requester=" + userId + ", dest="+rdest+", uri="+uri);
    // call actual backend   
    req.query.destOverrides = "BTP_DUMMY|"+dest;
    const service = await cds.connect.to(resolveDestination(req,"BTP_DUMMY"));
    const result = await service.tx(req).get(uri); //
    const ret = JSON.stringify(result || {})
    // end of the call
    const endTime = new Date().getTime();
    console.log(ret);
    console.log("# callBackend completed, took time: "+(endTime-startTime)+" msecs");
    return ret;
}