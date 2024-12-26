const { Router } = require('express');
const User = require('../model/user');
const {sendRegistrationEmail} = require('../utils/emailService')
const multer = require('multer');
const path = require('path');
const Images = require('../model/images');
const Summary = require('../model/history');
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const router = Router();

router.get('/signin', (req, res) => {
    return res.render("signin");
})

router.get('/signup', (req, res) => {
    return res.render("signup");
})


router.post('/signin', async (req, res) => {
    const { email, Password } = req.body;
    try {
        const token = await User.matchPasswordAndGenerateToken(email, Password);
        return res.cookie('Token', token).redirect('/user/chatwithpdf');
    } catch (error) {
        return res.render("signin", {
            error: "Incorrect Email or Password",
        });
    }
})

router.post('/signup', async (req, res) => {
    const { fullName, email, Password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('signup', { error: 'This email is already registered.' });
        }

        const newUser = new User({ fullName, email, Password });
        await newUser.save();

        await sendRegistrationEmail(email, fullName);

        res.render('signin', { success: 'Registration successful! Please log in.' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.render('signup', { error: 'An error occurred. Please try again later.' });
    }
});


router.get('/logout', (req,res)=>{
    res.clearCookie("Token").redirect('/');
})

router.get('/deletepic',async (req,res)=>{
  await Images.deleteOne({});
  return res.redirect('/user/chatwithpdf');
})

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.resolve(`./public/uploads`))
    },
    filename: function (req, file, cb) {
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename);
    }
  })
  
  const upload = multer({ storage: storage })

  router.get('/chatwithpdf', async (req, res) => {
    try {
        let userImage = { coverImageURL: '/images/default.png' };
        let summaries = [];

        if (req.user) {
            userImage = await Images.findOne({ createdBy: req.user.id }) || userImage;
            summaries = await Summary.find({ createdBy: req.user.id }) || [];
        }

        res.render('chatwithpdf', {
            user: req.user || null,
            images: userImage,
            summary: null,
            summaries: summaries
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.post("/chatwithpdf", upload.fields([{ name: "coverImage", maxCount: 1 }, { name: "pdf", maxCount: 1 }]), async (req, res) => {
    try {
        const { coverImage, pdf } = req.files;

        if (coverImage && req.user) {
            await Images.create({
                createdBy: req.user.id,
                coverImageURL: `/uploads/${coverImage[0].filename}`
            });
        }

        if (pdf) {
            const filePath = pdf[0].path;
            const pdfName = pdf[0].originalname;
            const summaryLength = req.body?.summaryLength;

            if (!filePath || !summaryLength) {
                return res.render("chatwithpdf", {
                    user: req.user || null,
                    images: req.user
                        ? await Images.findOne({ createdBy: req.user.id }) || { coverImageURL: '/images/default.png' }
                        : { coverImageURL: '/images/default.png' },
                    summary: "Error: Missing file or summary length.",
                    summaries: req.user
                        ? await Summary.find({ createdBy: req.user.id }) || []
                        : []
                });
            }

            try {
                const formData = new FormData();
                formData.append("file", fs.createReadStream(filePath));
                formData.append("length", summaryLength);

                const response = await axios.post(
                    "http://127.0.0.1:5000/summarize",
                    formData,
                    { headers: formData.getHeaders() }
                );

                const generatedSummary = response.data.summary;
                if (req.user) {
                    await Summary.create({
                        createdBy: req.user.id,
                        pdfName: pdfName,
                        summary: generatedSummary
                    });
                }

                const summaries = req.user
                    ? await Summary.find({ createdBy: req.user.id })
                    : [];

                res.render("chatwithpdf", {
                    user: req.user || null,
                    images: req.user
                        ? await Images.findOne({ createdBy: req.user.id }) || { coverImageURL: '/images/default.png' }
                        : { coverImageURL: '/images/default.png' },
                    summary: generatedSummary,
                    summaries: summaries
                });
            } catch (error) {
                console.error("Summarization error:", error.message);
                res.render("chatwithpdf", {
                    user: req.user || null,
                    images: req.user
                        ? await Images.findOne({ createdBy: req.user.id }) || { coverImageURL: '/images/default.png' }
                        : { coverImageURL: '/images/default.png' },
                    summary: "Error: " + error.message,
                    summaries: req.user
                        ? await Summary.find({ createdBy: req.user.id }) || []
                        : []
                });
            } finally {
                try {
                    fs.unlinkSync(filePath);
                } catch (cleanupError) {
                    console.error("File cleanup error:", cleanupError.message);
                }
            }
        } else {
            res.render("chatwithpdf", {
                user: req.user || null,
                images: req.user
                    ? await Images.findOne({ createdBy: req.user.id }) || { coverImageURL: '/images/default.png' }
                    : { coverImageURL: '/images/default.png' },
                summary: "Error: No PDF file uploaded.",
                summaries: req.user
                    ? await Summary.find({ createdBy: req.user.id }) || []
                    : []
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/summary/:id', async (req, res) => {
    try {
        const summary = await Summary.findById(req.params.id);
        if (req.user) {
            summaries = await Summary.find({ createdBy: req.user.id }) || [];
        }
        if (!summary) {
            return res.status(404).send('Summary not found');
        }
        res.render('summary', {
            summary,
            user: req.user
         });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;