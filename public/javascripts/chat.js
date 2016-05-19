window.onload = function() {    
    var messages = [];
    var socket = io.connect('http://172.20.1.203:4000');
    var field = document.getElementById("field");
    var sendButton = document.getElementById("send");
    var content = document.getElementById("content");
 
    socket.on('message', function (data) {
        if(data.message) {
            messages.push(data.message);
            var html = '';
            for(var i=0; i<messages.length; i++) {
                html += messages[i] + '<br />';
            }
            content.innerHTML = html;
            content.scrollTop = content.scrollHeight;
        } else {
            console.log("There is a problem:", data);
        }
    });
    
    socket.on('progress', function (data) {
        if(data.message) {                     
            /*
            var html = '';
            for(var i=0; i<messages.length; i++) {
                html += messages[i] + '<br />';
            }
            html += data.message;
            content.innerHTML = html;
            content.scrollTop = content.scrollHeight;
            */
            field.value =  data.message;
            
        } else {
            console.log("There is a problem:", data);
        }
    });
 
    sendButton.onclick = function() {
        var text = field.value;
        socket.emit('send', { message: text });
    };
 
}