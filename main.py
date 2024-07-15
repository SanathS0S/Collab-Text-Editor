from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_sqlalchemy import SQLAlchemy
import pdfkit 
import base64
app = Flask(__name__)
app.config["SECRET_KEY"] = "DSPROJECT"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///Page.sqlite3'
db = SQLAlchemy(app)

socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=100000000)

# Keep track of the current document content for each room
class Page(db.Model):
    id = db.Column(db.String(50), primary_key=True, unique=False)  # Assuming room ID is a string
    html_content = db.Column(db.Text)

@app.route("/", methods=["POST", "GET"])
def home():
    return render_template('home.html')

# Handle client joining a room
@socketio.on('join_room')
def on_join(data):
    room = data['room'] #Contains the room id (private....)
    
    join_room(room)
    content = ""
    doc = Page.query.filter_by(id=room).first() #Retrieves the tuple that stores content using ID
    if doc: #Check if the doc exists and if it does update the content to the docs content
        content = doc.html_content
        #print("This is the content",content)
        db.session.commit()
    else: #If doc doesnt exist create a new doc and store empty string
        new_room = Page(id=room, html_content=content)
        db.session.add(new_room)
        db.session.commit()
    emit('joined_room', {'content':content}, room=room,broadcast=True)

# Handle client leaving a room
@socketio.on('leave_room')
def on_leave(data):
    room = data['room']
    leave_room(room)
    emit('left_room', room, room=room)

# Handle incoming changes from clients
@socketio.on('update_document')
def handle_update(data):
    room = data['room']
    document_content = data['content'] #Contains the delta for the webpage
    wholeDOC = data['doc_content'] #Contains the entire pages HTML
    doc = Page.query.filter_by(id=room).first() 
    if doc: #Queries to check if document exists
        doc.html_content = wholeDOC #Everytime a change occurs update the database
        db.session.commit()
    # print(doc.id,doc.html_content)
    print("This is the delta: ",document_content)
    emit('document_updated', {'content': document_content}, room=room, include_self=False)

@socketio.on('download_pdf')
def download_pdf(data):
    content = data['content']
    pdfpath = "test.pdf"
    pdf = pdfkit.from_string(content, 'test.pdf')
    with open(pdfpath, 'rb') as pdf_file:
        pdf_content = pdf_file.read()
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    emit('pdf',{'content':pdf_base64})

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True)
    #socketio.run(app, host='172.20.10.2', debug=True)
