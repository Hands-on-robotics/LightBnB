
const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((user) => {
      return user.rows[0] || null;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((user) => {
      return user.rows[0] || null;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  return pool
    .query(`INSERT INTO users (name, email, password) VALUES
    ($1, $2, $3) RETURNING *;`, [user.name, user.email, user.password])
    .then((user) => {
      return user.rows[0] || null;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const query = `SELECT reservations.id, properties.title, properties.cost_per_night, reservations.start_date, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`;

  return pool
    .query(query, [guest_id, limit])
    .then((reservations) => {
      return reservations.rows || null;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
};

/// Properties

// /**
//  * Get all properties.
//  * @param {{}} options An object containing query options.
//  * @param {*} limit The number of results to return.
//  * @return {Promise<[{}]>}  A promise to the properties.
//  */

const getAllProperties = (options, limit = 10) => {
  console.log(options);
  const values = [];
  const conditions = [];

  let queryString = `SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id `;

  // add appropriate options to query string
  if (options.city) {
    values.push(`%${options.city}%`);
    conditions.push(`city LIKE $${values.length}`);
  }

  if (options.maximum_price_per_night) {
    values.push(`${options.maximum_price_per_night}`);
    conditions.push(`cost_per_night < $${values.length}`);
  }

  if (options.minimum_price_per_night) {
    values.push(`${options.minimum_price_per_night}`);
    conditions.push(`cost_per_night > $${values.length}`);
  }

  if (options.owner_id) {
    values.push(`${options.owner_id}`);
    conditions.push(`owner_id = $${values.length}`);
  }

  // check if any where conditions exist, join and add to query
  queryString += conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  queryString += `GROUP BY properties.id `;

  // check for rating filter, add to queryString
  if (options.minimum_rating) {
    values.push(`${options.minimum_rating}`);
    queryString += `HAVING AVG(rating) >= $${values.length} `;
  }

  // add limit to queryString
  values.push(limit);
  queryString +=
  `ORDER BY cost_per_night
  LIMIT $${values.length};`;


  return pool
    .query(queryString, values)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  
  // Collect the property values in the order of the SQL query parameters
  const values = [
    property.title,
    property.description,
    property.owner_id,
    property.cover_photo_url,
    property.thumbnail_photo_url,
    property.cost_per_night,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
    property.province,
    property.city,
    property.country,
    property.street,
    property.post_code
  ];
  
  // Construct the SQL query string with parameter placeholders
  let queryString = `INSERT INTO properties (
    title, description, owner_id, cover_photo_url, thumbnail_photo_url, cost_per_night, 
    parking_spaces, number_of_bathrooms, number_of_bedrooms, province, city, 
    country, street, post_code
  ) VALUES (`;

  // Dynamically generate placeholders for each value
  queryString += values.map((_, index) => `$${index + 1}`).join(', ');
  queryString += ')';

  // queryString += buildQueryParamListFromArrayOfValues(values);

  // Execute the query with the provided values
  return pool
    .query(queryString, values)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
