from flask import Flask
import json
import turtle
import urllib.request
import time
app = Flask(__name__)

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
    #get the ampunt of astronauts on the iss
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

    text = text[:-1] + '], "number" : ' + str(counter) + ', "latitude" : ' + str(lat) + ', "longitude" : ' + str(
        lon) + ', "altitude" : ' + str(alt) + ', "velocity" : ' + str(
        vel) + ', "velocity unit" : ' + velocity_unit + ', "altitude unit" : ' + altitude_unit + '}'

    return text

if __name__ == '__main__':
    app.run()