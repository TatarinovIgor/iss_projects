import json
import urllib.request
from distutils.debug import DEBUG
from flask import Flask, render_template

app = Flask(__name__, static_folder="static")

metric_imperial = False


def position():
    url = "https://api.wheretheiss.at/v1/satellites/25544"
    response = urllib.request.urlopen(url)
    result = json.loads(response.read())

    if metric_imperial:
        lat = result['latitude']
        lon = result['longitude']
        alt = result['altitude'] * 0.62137119
        vel = result['velocity'] * 0.62137119
    else:
        lat = result['latitude']
        lon = result['longitude']
        alt = result['altitude']
        vel = result['velocity']
    return lat, lon, alt, vel


if metric_imperial:
    system = "miles"
    altitude_unit = '"miles"'
    velocity_unit = '"miles/hours"'
else:
    system = "kilometers"
    velocity_unit = '"kilometers/hours"'
    altitude_unit = '"kilometers"'


@app.route('/')
def output():
    return render_template("index.html")


@app.route('/map')
def map():
    return render_template("map.html")


@app.route('/tracker-2d')
def tracker_2d():
    # get the ampunt of astronauts on the iss
    url = "http://api.open-notify.org/astros.json"
    response = urllib.request.urlopen(url)
    result = json.loads(response.read())
    people = result["people"]
    counter = 0
    text = '{"people" : ['
    for p in people:
        if p["craft"] == "ISS":
            counter += 1
            text += '{"name" : ' + '"' + p['name'] + '"' + '},'

    lat, lon, alt, vel = position()

    data = {'lat': lat, 'lon': lon, 'alt': alt, 'vel': vel}

    return render_template("tracker2d.html", data=data)

@app.route('/tracker-3d')
def tracker_3d():
    return render_template("tracker3d.html")


if __name__ == "__main__":
    app.run()
