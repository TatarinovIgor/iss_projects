from distutils.debug import DEBUG
from flask import Flask, render_template

app = Flask(__name__, static_folder="static")


@app.route('/')
def hello():
    return render_template("index.html")


@app.route('/map')
def map():
    return render_template("map.html")


@app.route('/tracker-2d')
def tracker_2d():
    return render_template("tracker2d.html")


@app.route('/tracker-3d')
def tracker_3d():
    return render_template("tracker3d.html")


if __name__ == "__main__":
    app.run()
