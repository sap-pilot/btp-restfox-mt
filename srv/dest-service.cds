@path: '/dest'
service DestService @(requires: 'authenticated-user') {
    @(requires: 'User')
    action proxy(requestBody:String) returns String;
}
