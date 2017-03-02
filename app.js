#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const MbTiles = require('mbtiles');
var db;
const q = require('q');
const fs = require('fs');

function insertData(db, row) {
  var deferred = q.defer();

  db.run("INSERT INTO images64 VALUES(?,?)", [row.tile_id, row.tile_data.toString('base64')], function (err) {
    if(err){
      deferred.reject(err)
    } else {
      deferred.resolve();
    }

  });

  return deferred.promise;
}

function each() {
  const deferred = q.defer();

  const actions = [];

  const eachPromise = q.defer();
  db.each("SELECT * FROM images", (err, row)=>{
    actions.push(insertData(db, row));
    eachPromise.resolve();
  });
  actions.push(eachPromise.promise);

  return q.all(actions);
}

function dbRun(db, query, params) {
  const deferred = q.defer();

  db.run(query,params,function (err, response) {
    console.log("Running query", query, params);
    if(err)
      deferred.reject(err);
    else
      deferred.resolve(response);
  });

  return deferred.promise;

}

function go() {

  var newFilename = process.argv[2].split(".");
  newFilename.pop();
  newFilename = newFilename.join(".")+".apptiles";

  var stream = fs.createReadStream(process.argv[2]).pipe(fs.createWriteStream(newFilename));


  stream.on('finish', ()=>{
    db = new sqlite3.Database(newFilename);
    dbRun(db,"DROP TABLE IF EXISTS images64")
      .then(()=>dbRun(db,"CREATE TABLE images64 (tile_id TEXT, tile_data TEXT)"))
      .then(each)
      .then(()=>dbRun(db, "DROP TABLE images"))
      .then(()=>dbRun(db, "ALTER TABLE images64 RENAME TO images"))
      .then(()=>dbRun(db, "CREATE INDEX images_index ON images (tile_id)"))
      .then(()=>{
        console.log("start mbtiles");
        var deferred = q.defer();
        new MbTiles(newFilename, function (err, mbtiles) {
          console.log("MBTiles connected");
          if(err){
            deferred.reject({err: err, location: "mbtiles load"});
          } else {
            mbtiles.getInfo((err, data)=>{
              q.all([
                dbRun(db,"INSERT INTO metadata VALUES(?,?)", ["bounds", data.bounds.join(',')]),
                dbRun(db,"INSERT INTO metadata VALUES(?,?)", ["minzoom", data.minzoom]),
                dbRun(db,"INSERT INTO metadata VALUES(?,?)", ["maxzoom", data.maxzoom]),
                dbRun(db,"INSERT INTO metadata VALUES(?,?)", ["scheme", data.scheme])
              ]).then(deferred.resolve).catch(deferred.reject);
            })
          }
        });
        return deferred.promise;
      })
      .then(()=> {
        console.log("Processing complete");
        db.close()
      })
      .catch(err=>{
        console.error(err);
        console.log(err.trace())
      })
  })


}
go();