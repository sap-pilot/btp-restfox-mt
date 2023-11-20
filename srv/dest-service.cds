@path: '/dest'
service DestService @(requires: 'authenticated-user') {
    function call() returns String;
}
