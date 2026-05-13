from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "VocaStore Railway Working"


@app.route("/products")
def products():
    return {
        "success": True,
        "data": []
    }