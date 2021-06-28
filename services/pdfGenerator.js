const { searchAmazon } = require('unofficial-amazon-search');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const fs = require('fs');
const _ = require('lodash');
const axios = require('axios');
const {
  openBrowser,
  goto,
  setConfig,
  screenshot,
  closeBrowser,
  scrollDown,
  waitFor,
} = require('taiko');



// util to fetch image based on url.
async function fetchImage(src) {
  const image = await axios.get(src, {
    responseType: 'arraybuffer',
  });
  return image.data;
}

// crawl flipkart website and take screenshots and crop them for the report.
async function webCrawl(search) {
  setConfig({
    navigationTimeout: 60000,
  });
  await openBrowser({
    headless: false,
    args: ['--window-size=1920,1080', '--no-sandbox'],
  });
  await goto(`https://www.flipkart.com/search?q=${search}`);
  await waitFor(1000);
  await scrollDown(110);
  for (let i = 1; i <= 4; i++) {
    await screenshot({ path: `temp_pdf_gen_row${i}.png` });
    await scrollDown(440);
  }
  await closeBrowser();
  let imgCounter = 0;
  for (let i = 1; i <= 4; i++) {
    let originalImage = `temp_pdf_gen_row${i}.png`;
    for (let j = 1; j <= 4; j++) {
      try {
        let outputImage = `temp_pdf_gen_ss${imgCounter}.png`;
        await sharp(originalImage)
          .extract({ width: 320, height: 470, left: 300 * j, top: 60 })
          .toFile(outputImage);

        imgCounter += 1;
      } catch (e) {
        console.error('Error in cropping', e);
      }
    }
  }
}

// util to delete the temp files generated during the crawl and crop.
function deleteTempFiles() {
  const path = './';
  let regex = /^temp_pdf_gen_/;
  fs.readdirSync(path)
    .filter((f) => regex.test(f))
    .map((f) => fs.unlinkSync(path + f));
}

const service = {
  // get the required data to diplay in the report.
  async getSearchResults(req, res, next) {
    const { search } = req.query;
    const [ aResult ] = await Promise.all([
      searchAmazon(search),
      webCrawl(search),
    ]);
    req['topResAmazon'] = _.filter(
      aResult.searchResults,
      (prod) => !_.isEmpty(prod.prices)
    ).slice(0, 10);

    next();
  },

  // attach pdf to the response obj.
  async generateReport(req, res, next) {
    var document = new PDFDocument({ bufferPages: true, size: 'B0' });
    let buffers = [];
    document.on('data', buffers.push.bind(buffers));
    document.on('end', () => {
      deleteTempFiles();
      let pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          'Content-Length': Buffer.byteLength(pdfData),
          'Content-Type': 'application/pdf',
          'Content-disposition': 'attachment;filename=test.pdf',
        })
        .end(pdfData);
    });

    let logo = await fetchImage(
      'https://media.corporate-ir.net/media_files/IROL/17/176060/Oct18/Amazon%20logo.PNG'
    );
    document.image(logo, 20, 10, { width: 100, height: 60 });

    for (let item of req.topResAmazon) {
      const logo = await fetchImage(item.imageUrl);
      document.image(logo, { width: 200, height: 200 });
      document.moveDown();
      // set bold text for price
      document.font('Helvetica-Bold', 10);
      document.text(`PRICE: ${item.prices[0].price} $`, {
        width: 220,
        align: 'center',
      });
      // reset text weight
      document.font('Helvetica', 10);

      document.moveDown();

      document.text(item.title, {
        width: 220,
        align: 'left',
      });

      document.moveDown();
    }
    logo = await fetchImage(
      'https://1000logos.net/wp-content/uploads/2021/02/Flipkart-logo.png'
    );
    document.image(logo, 500, 10, { width: 100, height: 60 });
    document.moveTo(0, 0);
    for (let i = 0; i < 10; i++) {
      let cur = 160 * (i + 0.8 * i);
      if (i === 0) {
        cur = 80;
      }
      document.image(`./temp_pdf_gen_ss${i}.png`, 400, cur, {
        width: 230,
        height: 260,
      });
      document.moveDown();
    }
    document.end();
  },
};
module.exports = service;
