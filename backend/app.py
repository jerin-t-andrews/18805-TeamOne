from flask import Flask

app = Flask(__name__)

@app.route('/login', methods=['POST'])
def hello_world(username, password):
    # TODO: Process username and password and interact with db
    return f'Welcome {username}'

if __name__ == '__main__':
    app.run(debug=True)