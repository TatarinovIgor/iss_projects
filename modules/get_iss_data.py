import json
import turtle
import urllib.request
import time

metric_imperial = False

def position():
    url = "https://api.wheretheiss.at/v1/satellites/25544"
    response = urllib.request.urlopen(url)
    result = json.loads(response.read())

    if metric_imperial:
        lat = result['latitude']
        lon = result['longitude']
        alt = result['altitude']*0.62137119
    else:
        lat = result['latitude']
        lon = result['longitude']
        alt = result['altitude']
    return lat,lon,alt

if metric_imperial:
    system = "miles"
else:
    system = "kilometers"

#get the ampunt of astronauts on the iss
url = "http://api.open-notify.org/astros.json"
response = urllib.request.urlopen(url)
result = json.loads(response.read())

file = open("iss.txt", "w")

people = result["people"]
counter = 0
text = ""
for p in people:
    if p["craft"] == "ISS":
        counter+=1
        text+= p['name'] + " - on board" + "\n"
file.write("There are currently " +
           str(counter) + " astronauts on the ISS: \n\n")
file.write(text)

lat,lon,alt = position()

file.write("\nYour current lat / long / alt is:"+str(lat)+", "+str(lon)+", "+str(alt)+" "+system+"\n")
file.close()


screen = turtle.Screen()
screen.setup(1280, 720)
screen.setworldcoordinates(-180, -90, 180, 90)

# load the world map image
screen.bgpic("map.gif")
screen.register_shape("iss.gif")
iss = turtle.Turtle()
iss.shape("iss.gif")
iss.setheading(45)
iss.penup()

while True:
    # load the current status of the ISS in real-time


    # Extract the ISS location
    lat,lon,alt = position()

    # Ouput lon and lat to the terminal
    print("\nLatitude: " + str(lat))
    print("\nLongitude: " + str(lon))
    print("\nAltitude: " + str(alt))

    # Update the ISS location on the map
    iss.goto(lon, lat)

    # Refresh each 5 seconds
    time.sleep(5)