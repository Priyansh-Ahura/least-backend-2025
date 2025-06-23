const fs = require('fs');
const axios = require('axios')
const path = require('path');
const sharp = require('sharp');
const moment = require('moment');
const config = require('../../config')
const Helper = {};
const nodeMailer = require('nodemailer');
const emailRegEx = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*@[a-z0-9]+([a-z0-9]+)*(\.[a-z0-9]+([a-z0-9]+)*)*\.[a-z]{2,4}$/

// GenerateUniqueID
Helper.generateUniqueId = () => {
  let userId = '';
  for (let i = 0; i < 9; i++) { // Change condition to < 9
    userId += Math.floor(Math.random() * 10);
  }
  return userId;
};

Helper.generateGuestUniqueId = () => {
  let userId;
  const timestamp = Math.floor(Date.now() / 1000).toString(16); // 8 characters
  const randomHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(''); // 16 characters
  userId = timestamp + randomHex;
  return userId;
};

Helper.generateRoomURL = (length = 6) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let roomId = '';
  for (let i = 0; i < length; i++) {
    roomId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return roomId;
}

// Function to generate a random alphanumeric code
Helper.generateRandomCode = () => {
  const characters = '0123456789';
  const length = 5; // Adjust the length of the code as needed
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  return code;
};

// WriteErrorLog
Helper.writeErrorLog = async (req, error) => {
  const requestURL = req.protocol + '://' + req.get('host') + req.originalUrl
  const requestBody = JSON.stringify(req.body)
  const date = moment().format('MMMM Do YYYY, h:mm:ss a')
  fs.appendFileSync(
    'errorLog.log',
    'REQUEST DATE : ' +
    date +
    '\n' +
    'API URL : ' +
    requestURL +
    '\n' +
    'API PARAMETER : ' +
    requestBody +
    '\n' +
    'Error : ' +
    error +
    '\n\n'
  )
};

Helper.writeGameErrorLog = async (game, error, errorMessage) => {
  const date = moment().format('MMMM Do YYYY, h:mm:ss a');
  fs.appendFileSync(
    'gameError.log',
    'REQUEST DATE : ' + date + '\n' +
    'ACTION :' + game.action + '\n' +
    'ROOM ID :' + game.roomId + '\n' +
    'PLAYER ID :' + game.playerId + '\n' +
    'Message : ' + errorMessage + '\n' +
    'Error :' + error.message  + '\n' +
    'Stack :' + error.stack + '\n\n' + 
    '--------------------------------------------------------------------------------------------------------' + '\n\n\n'
  )
};


Helper.calculateCardDecks = (numPlayers) => {
  let decksNeeded = 1;

  if (numPlayers <= 4) {
    decksNeeded = 1;
  } else {
    decksNeeded = 2;
  }

  return decksNeeded;
}

Helper.shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

Helper.isValidEmailId = (email) => {
  return emailRegEx.test(email)
}

Helper.getRandomSuit = () => {
  const suits = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];
  const randomIndex = Math.floor(Math.random() * suits.length);
  return suits[randomIndex];
};

Helper.getValidImageUrl = async (filename, name = 'SH') => {
  if (filename?.includes(config.URL)) {
    var filename = filename.replace(config.URL, '');
  }

  if (filename === '' || filename === undefined || filename === null) {
    filename =
      'https://ui-avatars.com/api/?name=' +
      name +
      '&rounded=true&background=c39a56&color=fff'
  }
  else {

    if ((filename.search('https://') < 0) && (filename.search('http://') < 0)) filename = config.URL + filename
  }

  return filename.replaceAll(' ', '_').replace(/\\/g, '/')
}

Helper.sendSupportMail = async (emailContent) => {

  let transport = await nodeMailer.createTransport({
    host: config.EMAILSERVICE,
    port: config.EMAILPORT,
    secure: true,
    auth: {
      user: config.GMAIL,
      pass: config.GMAILPASS
    }
  })


  let details;
  if (emailContent.attachmentName) {
    details =
    {
      from: config.GMAIL, // sender address
      to: config.GMAIL, // list of receivers
      subject: emailContent.subject, // Subject line
      text: emailContent.text,
      attachments: [
        {
          filename: emailContent?.attachmentName,
          path: emailContent?.attachmentPath,
        }
      ]
    }
  } else {
    details =
    {
      from: config.GMAIL, // sender address
      to: config.GMAIL, // list of receivers
      subject: emailContent.subject, // Subject line
      text: emailContent.text,
    }
  }

  const info = await transport.sendMail(details, (err) => {

    if (err) {
      console.log(err)
    }
  })

  return info

}

Helper.getPaginationValues = async (totalDocs, limit, page) => {
  const paginationValues = {
    totalDocs,
    limit,
    page,
    totalPages: totalDocs % limit === 0 ? totalDocs / limit : Math.floor((totalDocs / limit)) + 1,
    pagingCounter: ((page - 1) * limit) + 1,
    hasPrevPage: page !== 1,
    hasNextPage: !(page * limit >= totalDocs),
    prevPage: page === 1 ? null : page - 1,
    nextPage: page * limit >= totalDocs ? null : page + 1
  }
  return paginationValues
}

Helper.removeSpaces = (str) => {
  try {
    if (typeof str !== 'string') return null
    return str.split(' ').join('_')
  } catch (err) {
    return err
  }
}


// Define possible options for each avatar part
const options = {
  avatarStyle: ['Circle', 'Transparent'],
  topType: [
    'NoHair', 'Eyepatch', 'Hat', 'Hijab', 'Turban', 'WinterHat1', 'WinterHat2', 'WinterHat3', 'WinterHat4', 'LongHairBigHair', 'LongHairBob', 'LongHairBun', 'LongHairCurly', 'LongHairCurvy', 'LongHairDreads', 'LongHairFrida', 'LongHairFro', 'LongHairFroBand', 'LongHairMiaWallace', 'LongHairNotTooLong', 'LongHairShavedSides', 'LongHairStraight', 'LongHairStraight2', 'LongHairStraightStrand', 'ShortHairDreads01', 'ShortHairDreads02', 'ShortHairFrizzle', 'ShortHairShaggyMullet', 'ShortHairShortCurly', 'ShortHairShortFlat', 'ShortHairShortRound', 'ShortHairShortWaved', 'ShortHairSides', 'ShortHairTheCaesar', 'ShortHairTheCaesarSidePart'
  ],
  accessoriesType: [
    'Blank', 'Kurt', 'Prescription01', 'Prescription02', 'Round', 'Sunglasses', 'Wayfarers'
  ],
  hairColor: [
    'Auburn', 'Black', 'Blonde', 'BlondeGolden', 'Brown', 'BrownDark', 'PastelPink', 'Blue', 'Platinum', 'Red', 'SilverGray'
  ],
  facialHairType: [
    'Blank', 'BeardMedium', 'BeardLight', 'BeardMajestic', 'MoustacheFancy', 'MoustacheMagnum'
  ],
  clotheType: [
    'BlazerShirt', 'BlazerSweater', 'CollarSweater', 'GraphicShirt', 'Hoodie', 'Overall', 'ShirtCrewNeck', 'ShirtScoopNeck', 'ShirtVNeck'
  ],
  clotheColor: [
    'Black', 'Blue01', 'Blue02', 'Blue03', 'Gray01', 'Gray02', 'Heather', 'PastelBlue', 'PastelGreen', 'PastelOrange', 'PastelRed', 'PastelYellow', 'Pink', 'Red', 'White'
  ],
  eyeType: [
    'Close', 'Cry', 'Default', 'Dizzy', 'EyeRoll', 'Happy', 'Hearts', 'Side', 'Squint', 'Surprised', 'Wink', 'WinkWacky'
  ],
  eyebrowType: [
    'Angry', 'AngryNatural', 'Default', 'DefaultNatural', 'FlatNatural', 'RaisedExcited', 'RaisedExcitedNatural', 'SadConcerned', 'SadConcernedNatural', 'UnibrowNatural', 'UpDown', 'UpDownNatural'
  ],
  mouthType: [
    'Concerned', 'Default', 'Disbelief', 'Eating', 'Grimace', 'Sad', 'ScreamOpen', 'Serious', 'Smile', 'Tongue', 'Twinkle', 'Vomit'
  ],
  skinColor: [
    'Tanned', 'Yellow', 'Pale', 'Light', 'Brown', 'DarkBrown', 'Black'
  ]
};

// Function to get a random element from an array
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

// Function to generate a random avatar URL
const generateRandomAvatarUrl = () => {
  const avatarUrl = `https://avataaars.io/?avatarStyle=${getRandomElement(options.avatarStyle)}&topType=${getRandomElement(options.topType)}&accessoriesType=${getRandomElement(options.accessoriesType)}&hairColor=${getRandomElement(options.hairColor)}&facialHairType=${getRandomElement(options.facialHairType)}&clotheType=${getRandomElement(options.clotheType)}&clotheColor=${getRandomElement(options.clotheColor)}&eyeType=${getRandomElement(options.eyeType)}&eyebrowType=${getRandomElement(options.eyebrowType)}&mouthType=${getRandomElement(options.mouthType)}&skinColor=${getRandomElement(options.skinColor)}`;
  return avatarUrl;
};

// Function to fetch and save the random avatar
Helper. fetchRandomAvatar = async (imageName) => {
  try {
      const avatarUrl = generateRandomAvatarUrl();
      const response = await axios.get(avatarUrl, {
          responseType: 'arraybuffer'
      });

      const svgBuffer = Buffer.from(response.data, 'binary');
      const uploadsPath = path.resolve(__dirname, '../../uploads/guest');
      if (!fs.existsSync(uploadsPath)) {
          fs.mkdirSync(uploadsPath, { recursive: true });
      }
      const jpgPath = path.join(uploadsPath, `${imageName}.jpg`);

      const imagePath = `uploads/guest/${imageName}.jpg`
      await sharp(svgBuffer)
          .jpeg()
          .toFile(jpgPath);

      return imagePath;
  } catch (error) {
      console.error('Error fetching avatar:', error);
  }
};



module.exports = Helper;