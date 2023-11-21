@path: '/dest'
service DestService @(requires: 'authenticated-user') {
    action proxy() returns String;
}
