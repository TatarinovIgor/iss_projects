from flask import Flask
app = Flask(__name__)

@app.route('/')
def output():
    text = ""
    file = open("iss.txt", "r")
    text = file.read()
    return text

if __name__ == '__main__':
    app.run()