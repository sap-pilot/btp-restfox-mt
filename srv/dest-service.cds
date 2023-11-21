@path: '/dest'
service DestService @(requires: 'authenticated-user') {
    action postDestination() returns String;
    function getDestination() returns String;
}
