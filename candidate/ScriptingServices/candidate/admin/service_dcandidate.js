var systemLib = require('system');
var ioLib = require('io');

// get method type
var method = request.getMethod();
method = method.toUpperCase();

//get primary keys (one primary key is supported!)
var idParameter = getPrimaryKey();

// retrieve the id as parameter if exist 
var id = xss.escapeSql(request.getParameter(idParameter));
var count = xss.escapeSql(request.getParameter('count'));
var metadata = xss.escapeSql(request.getParameter('metadata'));
var sort = xss.escapeSql(request.getParameter('sort'));
var limit = xss.escapeSql(request.getParameter('limit'));
var offset = xss.escapeSql(request.getParameter('offset'));
var desc = xss.escapeSql(request.getParameter('desc'));

var candidateId = xss.escapeSql(request.getParameter('candidateId'));

if (limit === null) {
	limit = 100;
}
if (offset === null) {
	offset = 0;
}

response.setCharacterEncoding("UTF-8");

if(!hasConflictingParameters()){
    if ((method === 'POST')) {
        createT_dcandidate();
    } else if ((method === 'GET')) {
        if (id) {
            readT_dcandidateEntity(id);
        } else if (count !== null) {
            countT_dcandidate();
        } else if (metadata !== null) {
            metadataT_dcandidate();
        } else {
            readT_dcandidateList();
        }
    } else if ((method === 'PUT')) {
        updateT_dcandidate();    
        
    } else if ((method === 'DELETE')) {
        if(candidateId !== null){
            deleteT_dcandidate(candidateId);
        }
        
    } else {
        makeError(javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST, 1, "Invalid HTTP Method");
    }    
}



// flush and close the response
response.getWriter().flush();
response.getWriter().close();

function hasConflictingParameters(){
    if(id !== null && count !== null){
        makeError(javax.servlet.http.HttpServletResponse.SC_EXPECTATION_FAILED, 1, "Precondition failed: conflicting parameters - id, count");
        return true;
    }
    if(id !== null && metadata !== null){
        makeError(javax.servlet.http.HttpServletResponse.SC_EXPECTATION_FAILED, 1, "Precondition failed: conflicting parameters - id, metadata");
        return true;
    }
    return false;
}

function isInputParameterValid(paramName){
    var param = request.getParameter(paramName);
    if(param === null || param === undefined){
        makeError(javax.servlet.http.HttpServletResponse.SC_PRECONDITION_FAILED, 1, "Expected parameter is missing: " + paramName);
        return false;
    }
    return true;
}

// print error
function makeError(httpCode, errCode, errMessage) {
    var body = {'err': {'code': errCode, 'message': errMessage}};
    response.setStatus(httpCode);
    response.setHeader("Content-Type", "application/json");
    response.getWriter().print(JSON.stringify(body));
}

function sendErrorMesaage(message){
    var error = {};
    error.id = true;
    error.errorMessage = message;
    response.getWriter().println(JSON.stringify(error, null, 2));
}

function validateRequest(data){
    var valid = true;
    
    if(!data.firstnaame){
        sendErrorMesaage("Name is required");
        valid = false;
        return; 
    }
    
    if(!data.email){
        sendErrorMesaage("Email is required");
         valid = false;
        return; 
    }
    
    if(!data.course){
        sendErrorMesaage("Course is required!");
          valid = false;
        return; 
    } else {
        if(isNaN(parseInt(data.course))){
            sendErrorMesaage("Course has inappropriate value!");
            valid = false;
            return; 
        }
    }
    
    if(data.others){
        if(data.others.length >=256){
            sendErrorMesaage("Description is too long!");
              valid = false;
            return; 
        }
    }
    
    return valid;
}

// create entity by parsing JSON object from request body
function createT_dcandidate() {
    var input = ioLib.read(request.getReader());
    var message = JSON.parse(input);
    
    var connection = datasource.getConnection();
    try {
        var sql = "INSERT INTO T_DCANDIDATE (";
        sql += "ID";
        sql += ",";
        sql += "FIRSTNAME";
        sql += ",";
        sql += "LASTNAME";
        sql += ",";
        sql += "EMAIL";
        sql += ",";
        sql += "UNIVERSITY";
        sql += ",";
        sql += "COURSE";
        sql += ",";
        sql += "OTHER";
        sql += ") VALUES ("; 
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ",";
        sql += "?";
        sql += ")";

        var statement = connection.prepareStatement(sql);
        var i = 0;
        var id = db.getNext('T_DCANDIDATE_ID');
        statement.setInt(++i, id);
        statement.setString(++i, message.firstname);
        statement.setString(++i, message.lastname);
        statement.setString(++i, message.email);
        statement.setString(++i, message.university);
        statement.setInt(++i, message.course);
        statement.setString(++i, message.other);
        statement.executeUpdate();
        response.getWriter().println(id);
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

// read single entity by id and print as JSON object to response
function readT_dcandidateEntity(id) {
    var connection = datasource.getConnection();
    try {
        var result = "";
        var sql = "SELECT * FROM T_DCANDIDATE WHERE "+pkToSQL();
        var statement = connection.prepareStatement(sql);
        statement.setString(1, id);
        
        var resultSet = statement.executeQuery();
        var value;
        while (resultSet.next()) {
            result = createEntity(resultSet);
        }
        if(result.length === 0){
            makeError(javax.servlet.http.HttpServletResponse.SC_NOT_FOUND, 1, "Record with id: " + id + " does not exist.");
        }
        var text = JSON.stringify(result, null, 2);
        response.getWriter().println(text);
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

// read all entities and print them as JSON array to response
function readT_dcandidateList() {
    var connection = datasource.getConnection();
    try {
        var result = [];
        var sql = "SELECT ";
        if (limit !== null && offset !== null) {
            sql += " " + db.createTopAndStart(limit, offset);
        }
        sql += " * FROM T_DCANDIDATE";
        if (sort !== null) {
            sql += " ORDER BY " + sort;
        }
        if (sort !== null && desc !== null) {
            sql += " DESC ";
        }
        if (limit !== null && offset !== null) {
            sql += " " + db.createLimitAndOffset(limit, offset);
        }
        var statement = connection.prepareStatement(sql);
        var resultSet = statement.executeQuery();
        var value;
        while (resultSet.next()) {
            result.push(createEntity(resultSet));
        }
        var text = JSON.stringify(result, null, 2);
        response.getWriter().println(text);
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

//create entity as JSON object from ResultSet current Row
function createEntity(resultSet, data) {
    var result = {};
	result.id = resultSet.getInt("ID");
    
    result.firstname = resultSet.getString("FIRSTNAME");
    if(result.firstname === 'undefined' || !result.firstname){result.firstname = "-";}
    
    result.lastname = resultSet.getString("LASTNAME");
    if(result.lastname === 'undefined' || !result.lastname){result.lastname = "-";}
    
    result.email = resultSet.getString("EMAIL");
    if(result.email === 'undefined' || !result.email){result.email = "-";}
    
    result.university = resultSet.getString("UNIVERSITY");
    if(result.university === 'undefined' || !result.university){result.university = "-";}
    
	result.course = resultSet.getInt("COURSE");
    if(result.course === 'undefined' || !result.course ){result.course = "-";}
    
    result.major = resultSet.getString("MAJOR");
    if(result.major === 'undefined' || !result.major){result.major = "-";}
    
    result.other = resultSet.getString("OTHER");
    if(result.other === 'undefined' || !result.other){result.other = "-";}
    
    return result;
}

// update entity by id
function updateT_dcandidate() {
    var input = ioLib.read(request.getReader());
    var message = JSON.parse(input);
    var connection = datasource.getConnection();
    try {
        var sql = "UPDATE T_DCANDIDATE SET ";
        sql += "FIRSTNAME = ?";
        sql += ",";
        sql += "LASTNAME = ?";
        sql += ",";
        sql += "EMAIL = ?";
        sql += ",";
        sql += "UNIVERSITY = ?";
        sql += ",";
        sql += "COURSE = ?";
        sql += ",";
        sql += "OTHER = ?";
        sql += " WHERE ID = ?";
        var statement = connection.prepareStatement(sql);
        var i = 0;
        statement.setString(++i, message.firstname);
        statement.setString(++i, message.lastname);
        statement.setString(++i, message.email);
        statement.setString(++i, message.university);
        statement.setInt(++i, message.course);
        statement.setString(++i, message.other);
        var id = "";
        id = message.id;
        statement.setInt(++i, id);
        statement.executeUpdate();
        response.getWriter().println(id);
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

// delete entity
function deleteT_dcandidate(id) {
    var connection = datasource.getConnection();
    try {
        var sql = "DELETE FROM T_DCANDIDATE WHERE ID = ?";
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, id);
        var resultSet = statement.executeUpdate();
        response.getWriter().println(id);
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
}

function countT_dcandidate() {
    var count = 0;
    var connection = datasource.getConnection();
    try {
        var statement = connection.createStatement();
        var rs = statement.executeQuery('SELECT COUNT(*) FROM T_DCANDIDATE');
        while (rs.next()) {
            count = rs.getInt(1);
        }
    } catch(e){
        var errorCode = javax.servlet.http.HttpServletResponse.SC_BAD_REQUEST;
        makeError(errorCode, errorCode, e.message);
    } finally {
        connection.close();
    }
    response.getWriter().println(count);
}

function metadataT_dcandidate() {
	var entityMetadata = {};
	entityMetadata.name = 't_dcandidate';
	entityMetadata.type = 'object';
	entityMetadata.properties = [];
	
	var propertyid = {};
	propertyid.name = 'id';
	propertyid.type = 'integer';
	propertyid.key = 'true';
	propertyid.required = 'true';
    entityMetadata.properties.push(propertyid);

	var propertyfirstname = {};
	propertyfirstname.name = 'firstname';
    propertyfirstname.type = 'string';
    entityMetadata.properties.push(propertyfirstname);

	var propertylastname = {};
	propertylastname.name = 'lastname';
    propertylastname.type = 'string';
    entityMetadata.properties.push(propertylastname);

	var propertyemail = {};
	propertyemail.name = 'email';
    propertyemail.type = 'string';
    entityMetadata.properties.push(propertyemail);

	var propertyuniversity = {};
	propertyuniversity.name = 'university';
    propertyuniversity.type = 'string';
    entityMetadata.properties.push(propertyuniversity);

	var propertycourse = {};
	propertycourse.name = 'course';
	propertycourse.type = 'integer';
    entityMetadata.properties.push(propertycourse);

	var propertyother = {};
	propertyother.name = 'other';
    propertyother.type = 'string';
    entityMetadata.properties.push(propertyother);


    response.getWriter().println(JSON.stringify(entityMetadata));
}

function getPrimaryKeys(){
    var result = [];
    var i = 0;
    result[i++] = 'ID';
    if (result === 0) {
        throw new Exception("There is no primary key");
    } else if(result.length > 1) {
        throw new Exception("More than one Primary Key is not supported.");
    }
    return result;
}

function getPrimaryKey(){
	return getPrimaryKeys()[0].toLowerCase();
}

function pkToSQL(){
    var pks = getPrimaryKeys();
    return pks[0] + " = ?";
}
