const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());

let db = null;
const dbPath = path.join(__dirname, "covid19India.db");

const intializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Serever Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

intializeDbAndServer();

const convertDbObjectToResponseObject = (eachState) => {
  return {
    stateId: eachState.state_id,
    stateName: eachState.state_name,
    population: eachState.population,
  };
};

// GET All States API
app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `SELECT * FROM state;`;
  const statesArray = await db.all(getAllStatesQuery);
  response.send(
    statesArray.map((eachState) => convertDbObjectToResponseObject(eachState))
  );
});

// GET state API
app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const stateArray = await db.get(getStateQuery);
  response.send(convertDbObjectToResponseObject(stateArray));
});

// CREATE(POST) district APT
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const getCreateDistrictQuery = `
    INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;
  await db.run(getCreateDistrictQuery);
  response.send("District Successfully Added");
});

// GET district API
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
  const convertCamelCaseObject = (district) => {
    return {
      districtId: district.district_id,
      districtName: district.district_name,
      stateId: district.state_id,
      cases: district.cases,
      cured: district.cured,
      active: district.active,
      deaths: district.deaths,
    };
  };
  const districtArray = await db.get(getDistrictQuery);
  response.send(convertCamelCaseObject(districtArray));
});

// DELETE district API
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

// UPDATE(PUT) district API
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
     UPDATE district 
     SET district_name = '${districtName}',
     state_id = ${stateId}, cases = ${cases}, cured = ${cured}, active = ${active},
     deaths = ${deaths}
     WHERE district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

// GET total cases, cured, active, deaths of specific state_id API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getTotalCovidStatusQuery = `
      SELECT SUM(cases) AS totalCases, SUM(cured) AS totalCured, SUM(active) AS totalActive, SUM(deaths) AS totalDeaths
      FROM district 
      WHERE state_id = ${stateId};
    `;
  const stats = await db.get(getTotalCovidStatusQuery);
  response.send(stats);
});

// GET the stateName based on the district_id API
app.get("/districts/:districtId/details", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
       SELECT state.state_name AS stateName
       FROM state INNER JOIN district ON state.state_id = district.state_id
       WHERE district.district_id = ${districtId};
    `;
  const stateName = await db.get(getStateNameQuery);
  response.send(stateName);
});

module.exports = app;
