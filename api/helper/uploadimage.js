const moment = require('moment');
const multer = require('multer');
const Helper = require('../helper/index');
const fs = require('fs');

const Service = {};

Service.multerService = (path, fileType = 'image') => {
    try {
        const storage = multer.diskStorage({
            destination: function (req, file, cb) {
                const dir = `./uploads/${path}`;

                fs.access(dir, (err) => {
                    if (err) return fs.mkdir(dir, { recursive: true }, (error) => cb(error, dir));
                    return cb(null, dir);
                });
            },

            filename: function (req, file, cb) {
                cb(null, moment().format('YYYY-MM-DD-HH-MM-SS') + '-' + Helper.removeSpaces(file.originalname));
            }
        });

        let fileFilter = null;

        if (fileType === 'image') {
            fileFilter = function (req, file, cb) {
                if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png' || file.mimetype === 'image/svg' || file.mimetype === 'image/jpeg') {
                    cb(null, true);
                } else {
                    cb(
                        new Error(
                            'Please upload profile picture with extension jpg, jpeg, png, svg'
                        ),
                        false
                    );
                }
            };
        }

        const limits = { fileSize: 10 * 1024 * 1024 }; // Limit file size to 3MB

        const upload = multer({ storage, fileFilter, limits });
        return upload;
    } catch (error) {
        return error;
    }
};

module.exports = Service;
