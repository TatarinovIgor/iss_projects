from distutils.debug import DEBUG
from flask import Flask, render_template

app = Flask(__name__, static_folder="static")

@app.route('/')
def hello():
    return render_template("index.html")

@app.route('/map')
def map():
    return render_template("map.html")

if __name__ == "__main__":
    app.run(debug=True)