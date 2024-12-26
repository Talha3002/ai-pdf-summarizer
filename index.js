const express = require('express');
const path = require('path');
const app = express();
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const UserRoute = require('./routes/user');
const {checkForAuthenticationCookie } = require('./middlewares/authentication');
const PORT = 5000;

mongoose
    .connect('mongodb://localhost:27017/SWE')
    .then(() => console.log('DB Connected'));

app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.resolve("./public")));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("Token"));
app.use('/user', UserRoute);

app.get('/', (req, res) => {
    const user = req.user || null;
    res.render('home', { user });
});

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})