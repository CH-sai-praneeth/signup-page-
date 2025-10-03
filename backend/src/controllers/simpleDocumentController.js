const pdfParse = require('pdf-parse');

class SimpleDocumentController {
  
  async extractAndParsePDF(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const file = req.file;

      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({
          success: false,
          message: 'Please upload a PDF file'
        });
      }

      console.log('📄 Parsing PDF:', file.originalname);

      // Extract text from PDF
      const data = await pdfParse(file.buffer);
      const extractedText = data.text;

      console.log('✅ Text extracted, parsing with regex...');

      // Parse the text with regex patterns
      const parseText = (text) => {
        const propertyData = {
          address: '',
          yearBuilt: '',
          squareFeet: '',
          propertyType: '',
          bedrooms: '',
          bathrooms: '',
          stories: '',
          primaryMaterial: '',
          roofType: ''
        };

        // Year Built patterns
        const yearPatterns = [
          /year\s+built:?\s*(\d{4})/i,
          /built\s+in:?\s*(\d{4})/i,
          /construction\s+year:?\s*(\d{4})/i,
          /(\d{4})\s+construction/i
        ];
        
        for (const pattern of yearPatterns) {
          const match = text.match(pattern);
          if (match) {
            propertyData.yearBuilt = match[1];
            console.log('Found year:', match[1]);
            break;
          }
        }

        // Square Feet patterns
        const sqftPatterns = [
          /(\d{1,3}[,.]?\d{3})\s*sq\.?\s*ft/i,
          /(\d{1,3}[,.]?\d{3})\s*square\s+feet/i,
          /living\s+area:?\s*(\d{1,3}[,.]?\d{3})/i,
          /total\s+area:?\s*(\d{1,3}[,.]?\d{3})/i
        ];
        
        for (const pattern of sqftPatterns) {
          const match = text.match(pattern);
          if (match) {
            propertyData.squareFeet = match[1].replace(/[,\.]/g, '');
            console.log('Found sqft:', propertyData.squareFeet);
            break;
          }
        }

        // Bedrooms patterns
        const bedroomPatterns = [
          /(\d+)\s*bedrooms?/i,
          /bedrooms?:?\s*(\d+)/i,
          /(\d+)\s*br\b/i
        ];
        
        for (const pattern of bedroomPatterns) {
          const match = text.match(pattern);
          if (match) {
            propertyData.bedrooms = match[1];
            console.log('Found bedrooms:', match[1]);
            break;
          }
        }

        // Bathrooms patterns
        const bathroomPatterns = [
          /(\d+\.?\d*)\s*bathrooms?/i,
          /bathrooms?:?\s*(\d+\.?\d*)/i,
          /(\d+\.?\d*)\s*ba\b/i
        ];
        
        for (const pattern of bathroomPatterns) {
          const match = text.match(pattern);
          if (match) {
            propertyData.bathrooms = match[1];
            console.log('Found bathrooms:', match[1]);
            break;
          }
        }

        // Stories patterns
        const storyPatterns = [
          /(\d+)\s*story/i,
          /(\d+)\s*stories/i,
          /stories?:?\s*(\d+)/i,
          /(single|one)\s*story/i,
          /(two|2)\s*story/i
        ];
        
        for (const pattern of storyPatterns) {
          const match = text.match(pattern);
          if (match) {
            const storyText = match[1] || match[0];
            if (storyText.toLowerCase().includes('single') || storyText.toLowerCase().includes('one')) {
              propertyData.stories = '1';
            } else if (storyText.toLowerCase().includes('two') || storyText === '2') {
              propertyData.stories = '2';
            } else {
              propertyData.stories = match[1];
            }
            console.log('Found stories:', propertyData.stories);
            break;
          }
        }

        // Property Type patterns
        const typePatterns = [
          /property\s+type:?\s*(single\s+family|townhouse|condo|multi-family)/i,
          /(single\s+family|townhouse|condo|multi-family)\s+home/i,
          /type:?\s*(single\s+family|townhouse|condo|multi-family)/i
        ];
        
        for (const pattern of typePatterns) {
          const match = text.match(pattern);
          if (match) {
            propertyData.propertyType = match[1];
            console.log('Found property type:', match[1]);
            break;
          }
        }

        // Material patterns
        const materialPatterns = [
          /exterior:?\s*(brick|wood|vinyl|stucco|stone)/i,
          /(brick|wood|vinyl|stucco|stone)\s+exterior/i,
          /construction:?\s*(brick|wood|vinyl|stucco|stone)/i,
          /siding:?\s*(brick|wood|vinyl|stucco|stone)/i
        ];
        
        for (const pattern of materialPatterns) {
          const match = text.match(pattern);
          if (match) {
            propertyData.primaryMaterial = match[1].toLowerCase();
            console.log('Found material:', match[1]);
            break;
          }
        }

        // Roof Type patterns
        const roofPatterns = [
          /roof:?\s*(asphalt|metal|tile|slate|flat)/i,
          /(asphalt|metal|tile|slate|flat)\s+roof/i,
          /(shingle|shingles)/i
        ];
        
        for (const pattern of roofPatterns) {
          const match = text.match(pattern);
          if (match) {
            const roofText = match[1] || match[0];
            if (roofText.toLowerCase().includes('shingle')) {
              propertyData.roofType = 'asphalt';
            } else {
              propertyData.roofType = roofText.toLowerCase();
            }
            console.log('Found roof type:', propertyData.roofType);
            break;
          }
        }

        // Address patterns
        const addressPatterns = [
          /address:?\s*(.+?)(?:\n|,\s*[A-Z]{2})/i,
          /property\s+address:?\s*(.+?)(?:\n|$)/i,
          /location:?\s*(.+?)(?:\n|$)/i
        ];
        
        for (const pattern of addressPatterns) {
          const match = text.match(pattern);
          if (match) {
            propertyData.address = match[1].trim();
            console.log('Found address:', match[1]);
            break;
          }
        }

        return propertyData;
      };

      const propertyData = parseText(extractedText);

      res.json({
        success: true,
        data: propertyData,
        extractedText: extractedText,
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          pages: data.numpages,
          fieldsFound: Object.values(propertyData).filter(v => v).length
        }
      });

    } catch (error) {
      console.error('❌ PDF parsing error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to parse PDF',
        error: error.message
      });
    }
  }
}

module.exports = new SimpleDocumentController();