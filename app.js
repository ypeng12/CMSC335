const express = require('express');
const path = require('path');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const axios = require('axios');
const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');

require('dotenv').config();

const name = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const name_DB = process.env.MONGO_DB_NAME
const collectionName = process.env.MONGO_COLLECTION
const data_collection = {
	db: name_DB,
	collection: collectionName,
}

// ----------- Connect to MongoDB -----------
const uri = `mongodb+srv://${name}:${password}@cluster0.26cxh3i.mongodb.net/${name_DB}?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
	serverApi: ServerApiVersion.v1,
})


let db;

client.connect()
    .then(() => {
        console.log('Connected to MongoDB');
        db = client.db(data_collection.db); 
    })
    .catch(err => console.error('Failed to connect to MongoDB', err));

// Google reCAPTCHA setup
const recaptchaClient = new RecaptchaEnterpriseServiceClient();

async function verifyRecaptcha(token) {
  const projectID = process.env.RECAPTCHA_PROJECT_ID;
  const recaptchaKey = process.env.RECAPTCHA_SITE_KEY;
  const recaptchaAction = 'login'; // Example action

  const projectPath = recaptchaClient.projectPath(projectID);

  const assessmentRequest = {
    assessment: {
      event: {
        token: token,
        siteKey: recaptchaKey,
      },
    },
    parent: projectPath,
  };

  try {
    const [response] = await recaptchaClient.createAssessment(assessmentRequest);
    
    if (!response.tokenProperties.valid) {
      console.log(`Invalid token: ${response.tokenProperties.invalidReason}`);
      return false;
    }

    if (response.tokenProperties.action === recaptchaAction) {
      console.log(`reCAPTCHA score: ${response.riskAnalysis.score}`);
      return response.riskAnalysis.score;
    } else {
      console.log("Action mismatch in reCAPTCHA token");
      return false;
    }
  } catch (error) {
    console.error('Error during reCAPTCHA verification:', error);
    return false;
  }
}


// ----------- Set up App -----------
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', '.ejs')

// App config
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))



// ------------------ ROUTES ------------------

// GET - home page
app.get('/', (req, res) => {
	res.render('home')
})


app.get('/market', (req, res) => {
    res.render('market');
});



// POST - applyResult page - Insert apply to DB
app.post('/marketResult', async (req, res) => {

	const { brand,size } = req.body
	const now = new Date()
    // Basic validation (you can expand this as needed)
    if ( !brand|| !size) {
        return res.status(400).send("Invalid input data");
    }

	try {
		await client.connect()

		const app_collection = db.collection(data_collection.collection);


		// Insert apply to DB
		await app_collection.insertOne({
            // price:price,
			brand:brand,
			size:size,
			date: new Date(),
		})

		await client.close()

		return res.render('marketResult', {
            // price:price,
			brand:brand,
			size:size,
			date: new Date(),
		})
	} catch (error) {
		console.error(error);
		res.status(500).send("An error occurred while processing your request");
	}
})


app.get('/search', (req, res) => {
    
    // values = {
    //     url : `http://localhost:${PORT}/search`,
    //     homeUrl:`http://localhost:${PORT}`,
    
    
    //   }
        
      res.render("search");

});

app.post('/searchResult', async(req, res) => {
    // Fetch shoes data from MongoDB and  

    let size = req.body.size;

    let brand = req.body.brand;

    const filter = {
        size: size, // assuming size is a variable containing the user input
        brand: brand // assuming brand is a variable containing the user input
    };

           try {
        // const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect()
        const result = db.collection(data_collection.collection);
        const applicantResult = await result.find(filter);

        let applicantResult2 = await applicantResult.toArray();

		
        let ans = '<table><thead><tr><th>Brand</th><th>Size</th><th>Stock</th></tr></thead><tbody>';

        applicantResult2.forEach(i => {
            
            ans += `<tr><td>${i.brand}</td><td>${i.size}</td><td>${i.price}</td></tr>`;
        });

        ans += '</tbody></table>';

        const variables = {
            stock: ans
        };

        client.close();

        res.render("searchResult", variables);
    } catch (e) {
        console.error(e);
        res.send('Error occurred while processing the request.');
    }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// ------------------ USER INTERFACE ------------------
let data = ''
console.log(`Web server started and running at http://localhost:${PORT}`)
process.stdin.setEncoding('utf8')
process.stdout.write('Stop to shutdown the server: ')
process.stdin.on('readable', () => {
	data = process.stdin.read()
	if (data !== null) {
		let cmd = data.trim()
		if (cmd === 'stop') {
			console.log('Shutting down server')
			process.exit(0)
		}
	}
	process.stdout.resume()
})

module.exports = app
