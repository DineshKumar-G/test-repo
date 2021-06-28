const { searchAmazon } = require('unofficial-amazon-search');
const PDFDocument = require('pdfkit');
const http = require('http'),
  fileSystem = require('fs'),
  path = require('path');
const fs = require('fs');
const doc = new PDFDocument();
const _ = require('lodash');
const axios = require('axios');

async function fetchImage(src) {
  const image = await axios.get(src, {
    responseType: 'arraybuffer',
  });
  console.log(image.data);
  return image.data;
}

const servie = {
  async getSearchResults(req, res, next) {
    const { search } = req.query;
    const aResult = await searchAmazon(req.query.search[0]);
    req['topResAmazon'] = _.filter(
      aResult.searchResults,
      (prod) => !_.isEmpty(prod.prices)
    ).slice(0, 10);

    // console.log(data.searchResults[0]);
    // console.log(data.pageNumber); // 1
    // console.log(data.searchResults[0].title, data.searchResults[0].imageUrl);
    next();
  },

  async generateReport(req, res, next) {
    console.log('GENERATE!!!', req.topResAmazon);
    var document = new PDFDocument({ bufferPages: true });

    let buffers = [];
    document.on('data', buffers.push.bind(buffers));
    document.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          'Content-Length': Buffer.byteLength(pdfData),
          'Content-Type': 'application/pdf',
          'Content-disposition': 'attachment;filename=test.pdf',
        })
        .end(pdfData);
    });

    const logo = await fetchImage(
      'https://media.corporate-ir.net/media_files/IROL/17/176060/Oct18/Amazon%20logo.PNG'
    );
    document.image(logo, 20, 10, { width: 100, height: 60 });
    document.moveTo(230, 220);

    for (let [idx, item] of req.topResAmazon.entries()) {
      console.log('>>>>>>', item.prices);
      const logo = await fetchImage(item.imageUrl);
      document.image(logo, { width: 200, height: 200 });
      document.moveDown();
      document.font('Helvetica-Bold', 10);
      document.text(`PRICE: ${item.prices[0].price} $`, {
        width: 220,
        align: 'center',
      });
      document.font('Helvetica', 10);

      document.moveDown();

      document.text(item.title, {
        width: 220,
        align: 'left',
      });

      document.moveDown();
    }
    document.end();
  },
};
module.exports = servie;
