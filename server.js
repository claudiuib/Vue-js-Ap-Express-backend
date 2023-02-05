const express = require("express");
const morgan = require('morgan')
const app = express();
const cors = require('cors');

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

const port = process.env.PORT ? process.env.PORT : 3030;
const path = require("path");
var imagePath = path.resolve(__dirname,"image");

//sever up image

app.use("/image", express.static(imagePath));
//sever up everything in public
app.use( express.static('public'));


//properties
let propertiesReader = require("properties-reader");
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);
//database variables
let dbPrefix = properties.get("db.prefix");
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"))
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");

const uri = dbPrefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;


//mongoDb connection with Stable API



const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbName);

//object alignment
app.set('json spaces', 3);


app.use(cors());

app.use(morgan("short"));




//parameter for collection names
app.param('collectionName', function (req, res, next, collectionName) {
  req.collection = db.collection(collectionName);
  return next();
});

// get collection by name
app.get("/collections/:collectionName", async (req, res) => {
  try {
    await client.connect();
    const col = req.collection;
    const products = await col.find({}).toArray();
    res.status(200).json(products);

  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});
//get collectionName by id
app.get("/collections/:collectionName/:id", async (req, res) => {
  try {
  
    const col = req.collection;
    const products = await col.find({}).toArray();
    res.status(200).json(products);

  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

//create new collect
app.post('/collections/:collectionName', (req, res) => {
  let collection = req.collection
  collection.insertOne(req.body, (err, result) => {
    if (err) {
      res.send({ 'error': 'An error has occurred' });
    } else {
      res.send(req.body);
    }
  });
});



//delete  the collection object by id

app.delete('/collections/:collectionName/:id', (req, res) => {
   req.collection.deleteOne({ _id:new ObjectId(req.params.id) }, (err, result) => {
    if (err) {
      res.status(500).send({ error: err });
    } else {
      res.send(result);
    }
  });
});


app.put('/collections/:collectionName/:id',function (req,res,next){
  let collectionID=parseInt(req.params.id);
  req.collection.updateOne({id:collectionID},
      {$set:req.body},
      {safe:true,multi:false},function(err,result){

          if(err){
              return next(err);
          }
          res.send(result);
      });
});

//to search
// app.get('/collections/:collectionName/search',function (req,res,next){
//   let searchword=req.query.q;
//   req.collection.find({subject:
//           {$regex:new RegExp(searchword)}}).toArray(function(err,results){
//       if(err){
//           return next(err);
//       }
//           res.send(results);
//           });

// });
app.get("/collections/:collectionName/search", (req, res) => {
  const query = req.query.q;
  req.collectionName.find( { $or: [ { title: { $regex: query } }, { location: { $regex: query } } ] } ).toArray((err, items) => {
      if (err) {
          res.status(400).send(err);
      } else {
          res.status(200).send(items);
      }
  });
});







//error display

app.use(function(req,res){
  res.status(404).send("Error!! Not Found");
});


//Start the app listening on port 3030(if it's available)

app.listen(port, function () {
  console.log(`Server Running on port: http://localhost:${port}/collections/products`);

});

