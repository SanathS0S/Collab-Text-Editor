
    hljs.highlightAll();
    let quill;
    const socket = io();
    let didUserJoin = false;
    function sendUpdateToServer(delta,id,doc_content,didUserJoin) {
        if(didUserJoin===false){
            socket.emit("update_document", { room: id, content: delta,doc_content:doc_content });
        }
    }

    function getUniqueId() {
        return 'private-' + Math.random().toString(36).substring(2, 9);
    }

    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    };

    var id = getUrlParameter('id');
    if (!id) {
        id = getUniqueId();
        location.search = location.search
            ? '&id=' + id : 'id=' + id;
    }
    
    initQuill(id);
    
    function initQuill(id) {
        let toolbaroptions = [
            // header for text
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            // text style
            ["bold", "italic", "underline", "strike"],
            // bullet points
            [{ list: "ordered" }],
            // sub and super script
            [{ script: "sub" }, { script: "super" }],
            // indentation
            [{ indent: "+1" }, { indent: "-1" }],
            // alignment
            [{ align: [] }],
            // text size
            [{ size: ["small", "large", "huge", true] }],
            // adding image, link, video, or formula
            ["image", "link", "video", "formula"],
            // adding text color and background
            [{ color: [] }, { background: [] }],
            // adding font family
            [{ font: [] }],
            // adding code snippet
            ['code-block', "blockquote"]
        ];

        quill = new Quill("#editor", {
            modules: {
                syntax:true,
                toolbar: toolbaroptions,
            },
            theme: "snow",
        });
        
        // Add a listener for text changes
        quill.on("text-change", function (delta, oldDelta, source) {
            if (source === "user") {
                let doc_content = quill.root.innerHTML;
                console.log(didUserJoin);
                sendUpdateToServer(delta,id,doc_content,didUserJoin);
                didUserJoin = false;
            }
        });

        socket.on('joined_room',(content)=>{
            quill.root.innerHTML = content.content;
            didUserJoin = true;
            console.log(content.content);
        });
        // Handle incoming updates from the server
        socket.on("document_updated", (content) => {
            let delta = content.content;
            
            quill.updateContents(delta);
        });
        // Join the room for this document
        var content =  quill.root.innerHTML;
        
        socket.emit('join_room', { room: id,content:content});
    }
    
    

function saveAspdf() {
    console.log("ello");
    let doc = quill.root.innerHTML;
    socket.emit("download_pdf", {content:doc });
  }
socket.on('pdf', function(data) {
    const pdfContent = data.content; // Assuming data.content is the base64-encoded PDF content

    // Decode base64 to binary
    const byteCharacters = atob(pdfContent);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Create a Blob from the binary PDF content
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    // Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link element to trigger the download
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "Document.pdf";

    // Append the link to the document and trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
});
