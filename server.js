const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Serve static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Clean slug routes for Project / Property Details Page
app.get(['/project/:slug', '/property/:slug'], (req, res) => {
  res.sendFile(path.join(__dirname, 'project-details.html'));
});

app.use(express.static(__dirname));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const isDoc = file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/octet-stream';
    const isAllowedExt = /\.(jpe?g|png|webp|gif|svg|pdf|doc|docx)$/i.test(path.extname(file.originalname || ''));

    if (isImage || isDoc || isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed (${file.mimetype}). Allowed types: Images, PDF, DOC.`), false);
    }
  }
});

const blogUploadMiddleware = (req, res, next) => {
  upload.single('imageFile')(req, res, (err) => {
    if (err) {
      console.error('Blog upload error:', err.message);
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    next();
  });
};

// Helper Functions for JSON DB
function readData(file) {
  const filePath = path.join(DATA_DIR, file);
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
}

function writeData(file, data) {
  const filePath = path.join(DATA_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ================= AUTH APIs =================
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const adminData = readData('admin.json');

  if (username === adminData.username && password === adminData.password) {
    return res.json({
      success: true,
      token: 'golden-token-' + Date.now(),
      username: adminData.username
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid Username or Password!' });
});

app.post('/api/auth/change-password', (req, res) => {
  const { currentPassword, newPassword, newUsername } = req.body;
  const adminData = readData('admin.json');

  if (currentPassword !== adminData.password) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect!' });
  }

  adminData.password = newPassword || adminData.password;
  if (newUsername) adminData.username = newUsername;
  writeData('admin.json', adminData);

  res.json({ success: true, message: 'Admin credentials updated successfully!' });
});

// ================= STATS API =================
app.get('/api/stats', (req, res) => {
  const blogs = readData('blogs.json');
  const properties = readData('properties.json');
  const leads = readData('leads.json');
  const newLeads = leads.filter(l => l.status === 'New').length;

  res.json({
    totalBlogs: blogs.length,
    totalProperties: properties.length,
    totalLeads: leads.length,
    newLeads
  });
});

// ================= BLOGS APIs =================
app.get('/api/blogs', (req, res) => {
  const blogs = readData('blogs.json');
  res.json(blogs);
});

app.get('/api/blogs/:id', (req, res) => {
  const blogs = readData('blogs.json');
  const blog = blogs.find(b => b.id === req.params.id);
  if (!blog) return res.status(404).json({ message: 'Blog not found' });
  res.json(blog);
});

app.post('/api/blogs', blogUploadMiddleware, (req, res) => {
  const blogs = readData('blogs.json');
  const { title, category, date, readTime, badge, subLocation, excerpt, content, featured, imageUrl } = req.body;

  const imagePath = req.file ? `/uploads/${req.file.filename}` : (imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80');

  const newBlog = {
    id: (title || 'blog').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4),
    title: title || 'Untitled Blog',
    category: category || 'MARKET INSIGHTS',
    date: date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    readTime: readTime || '5 Min Read',
    badge: badge || 'EDITORIAL',
    subLocation: subLocation || '',
    excerpt: excerpt || '',
    content: content || '',
    image: imagePath,
    featured: featured === 'true' || featured === true,
    author: {
      name: req.body.authorName || 'Golden Advisory Team',
      role: req.body.authorRole || 'Senior Real Estate Analyst',
      avatar: req.body.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    },
    createdAt: new Date().toISOString()
  };

  blogs.unshift(newBlog);
  writeData('blogs.json', blogs);
  res.status(201).json({ success: true, blog: newBlog });
});

app.put('/api/blogs/:id', blogUploadMiddleware, (req, res) => {
  const blogs = readData('blogs.json');
  const index = blogs.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Blog not found' });

  const existing = blogs[index];
  const { title, category, date, readTime, badge, subLocation, excerpt, content, featured, imageUrl } = req.body;

  let imagePath = existing.image;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  } else if (imageUrl) {
    imagePath = imageUrl;
  }

  blogs[index] = {
    ...existing,
    title: title || existing.title,
    category: category || existing.category,
    date: date || existing.date,
    readTime: readTime || existing.readTime,
    badge: badge !== undefined ? badge : existing.badge,
    subLocation: subLocation !== undefined ? subLocation : existing.subLocation,
    excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
    content: content !== undefined ? content : existing.content,
    image: imagePath,
    featured: featured !== undefined ? (featured === 'true' || featured === true) : existing.featured,
    updatedAt: new Date().toISOString()
  };

  writeData('blogs.json', blogs);
  res.json({ success: true, blog: blogs[index] });
});

app.delete('/api/blogs/:id', (req, res) => {
  try {
    const rawTarget = decodeURIComponent(req.params.id || '').trim();
    const target = rawTarget.toLowerCase();
    let blogs = readData('blogs.json');
    const beforeCount = blogs.length;
    blogs = blogs.filter(b => {
      const bId = (b.id || '').toString().trim();
      const bSlug = (b.slug || '').toString().trim();
      return bId !== rawTarget && bId.toLowerCase() !== target && bSlug !== rawTarget && bSlug.toLowerCase() !== target;
    });
    if (blogs.length === beforeCount) return res.status(404).json({ success: false, message: 'Blog not found' });

    writeData('blogs.json', blogs);
    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= PROPERTIES APIs =================
app.get('/api/properties', (req, res) => {
  const properties = readData('properties.json');
  res.json(properties);
});

app.get('/api/properties/:id', (req, res) => {
  const properties = readData('properties.json');
  const param = (req.params.id || '').toLowerCase().trim();
  const property = properties.find(p => {
    const pId = (p.id || '').toLowerCase();
    const pSlug = (p.slug || '').toLowerCase();
    const pNameSlug = (p.name || p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return pId === param || pSlug === param || pNameSlug === param;
  });
  if (!property) return res.status(404).json({ message: 'Property not found' });
  res.json(property);
});

const propUpload = upload.fields([
  { name: 'imageFile', maxCount: 1 },
  { name: 'secondaryImageFile', maxCount: 1 },
  { name: 'siteLayoutFile', maxCount: 1 },
  { name: 'brochureFile', maxCount: 1 }
]);

const propUploadMiddleware = (req, res, next) => {
  propUpload(req, res, (err) => {
    if (err) {
      console.error('Property upload error:', err.message);
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    next();
  });
};

app.post('/api/properties', propUploadMiddleware, (req, res) => {
  try {
    const properties = readData('properties.json');
    const {
      name,
      title,
      slug,
      developer,
      location,
      city,
      type,
      price,
      priceNumeric,
      bhk,
      area,
      totalArea,
      status,
      possessionStatus,
      reraNo,
      overlooking,
      carParking,
      powerBackup,
      featured,
      imageUrl,
      secondaryImageUrl,
      brochureUrl,
      overview,
      amenities,
      priceList,
      floorPlans,
      specifications,
      siteLayoutUrl,
      siteLayoutDesc,
      locationAdvantages
    } = req.body;

    const propName = (name || title || 'Landmark Residence').trim();
    const imageFile = req.files && req.files.imageFile ? req.files.imageFile[0] : null;
    const secondaryImageFile = req.files && req.files.secondaryImageFile ? req.files.secondaryImageFile[0] : null;
    const siteLayoutFile = req.files && req.files.siteLayoutFile ? req.files.siteLayoutFile[0] : null;
    const brochureFile = req.files && req.files.brochureFile ? req.files.brochureFile[0] : null;

    const imagePath = imageFile ? `/uploads/${imageFile.filename}` : (imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80');
    const secondaryImagePath = secondaryImageFile ? `/uploads/${secondaryImageFile.filename}` : (secondaryImageUrl || '');
    const siteLayoutImg = siteLayoutFile ? `/uploads/${siteLayoutFile.filename}` : (siteLayoutUrl || '');
    const brochurePath = brochureFile ? `/uploads/${brochureFile.filename}` : (brochureUrl || '');

    // Parse amenities & location advantages if string
    let parsedAmenities = amenities;
    if (typeof amenities === 'string') {
      parsedAmenities = amenities.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    }

    let parsedAdvantages = locationAdvantages;
    if (typeof locationAdvantages === 'string') {
      parsedAdvantages = locationAdvantages.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }

    // Parse floorPlans array
    let parsedFloorPlans = [];
    if (floorPlans) {
      if (typeof floorPlans === 'string') {
        try {
          parsedFloorPlans = JSON.parse(floorPlans);
        } catch (e) {
          parsedFloorPlans = [];
        }
      } else if (Array.isArray(floorPlans)) {
        parsedFloorPlans = floorPlans;
      }
    }

    let finalPriceList = priceList || '';
    if ((!finalPriceList || !finalPriceList.trim()) && parsedFloorPlans.length > 0) {
      finalPriceList = parsedFloorPlans.map(fp => `${fp.title || 'Typical Floor Plan'}\n${fp.area || ''}\n${fp.price || ''}`).join('\n\n');
    }

    let numericPrice = parseFloat(priceNumeric);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      const match = (price || '').match(/(\d+(?:\.\d+)?)/);
      numericPrice = match ? parseFloat(match[1]) : 0;
    }

    const baseSlug = (slug || propName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProperty = {
      id: baseSlug + '-' + Date.now().toString().slice(-4),
      slug: baseSlug,
      name: propName,
      title: propName,
      developer: developer || 'Golden Developers',
      location: location || '',
      city: city || 'Gurugram',
      type: type || 'Residential',
      price: price || '₹ On Request',
      priceNumeric: numericPrice,
      bhk: bhk || '3,4',
      area: area || '',
      totalArea: totalArea || '',
      status: status || possessionStatus || 'New Launch,RERA Approved',
      possessionStatus: possessionStatus || status || 'Ready To Move In',
      reraNo: reraNo || '',
      overlooking: overlooking || '',
      carParking: carParking || '',
      powerBackup: powerBackup || '',
      image: imagePath,
      secondaryImage: secondaryImagePath,
      brochureUrl: brochurePath,
      featured: featured === 'true' || featured === true,
      overview: overview || '',
      amenities: parsedAmenities || [],
      floorPlans: parsedFloorPlans || [],
      priceList: finalPriceList,
      specifications: specifications || '',
      siteLayout: {
        image: siteLayoutImg,
        description: siteLayoutDesc || ''
      },
      locationAdvantages: parsedAdvantages || [],
      createdAt: new Date().toISOString()
    };

    properties.unshift(newProperty);
    writeData('properties.json', properties);
    res.status(201).json({ success: true, property: newProperty });
  } catch (err) {
    console.error('Error creating property:', err);
    res.status(500).json({ success: false, message: err.message || 'Error creating property' });
  }
});

app.put('/api/properties/:id', propUploadMiddleware, (req, res) => {
  try {
    const properties = readData('properties.json');
    const index = properties.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Property not found' });

  const existing = properties[index];
  const {
    name,
    title,
    slug,
    developer,
    location,
    city,
    type,
    price,
    priceNumeric,
    bhk,
    area,
    totalArea,
    status,
    possessionStatus,
    reraNo,
    overlooking,
    carParking,
    powerBackup,
    featured,
    imageUrl,
    secondaryImageUrl,
    brochureUrl,
    overview,
    amenities,
    priceList,
    floorPlans,
    specifications,
    siteLayoutUrl,
    siteLayoutDesc,
    locationAdvantages
  } = req.body;

  const propName = (name || title || existing.name || existing.title);
  const imageFile = req.files && req.files.imageFile ? req.files.imageFile[0] : null;
  const secondaryImageFile = req.files && req.files.secondaryImageFile ? req.files.secondaryImageFile[0] : null;
  const siteLayoutFile = req.files && req.files.siteLayoutFile ? req.files.siteLayoutFile[0] : null;
  const brochureFile = req.files && req.files.brochureFile ? req.files.brochureFile[0] : null;

  let imagePath = existing.image;
  if (imageFile) {
    imagePath = `/uploads/${imageFile.filename}`;
  } else if (imageUrl) {
    imagePath = imageUrl;
  }

  let secondaryImagePath = existing.secondaryImage || '';
  if (secondaryImageFile) {
    secondaryImagePath = `/uploads/${secondaryImageFile.filename}`;
  } else if (secondaryImageUrl) {
    secondaryImagePath = secondaryImageUrl;
  }

  let siteLayoutImg = (existing.siteLayout && existing.siteLayout.image) || '';
  if (siteLayoutFile) {
    siteLayoutImg = `/uploads/${siteLayoutFile.filename}`;
  } else if (siteLayoutUrl) {
    siteLayoutImg = siteLayoutUrl;
  }

  let brochurePath = existing.brochureUrl || '';
  if (brochureFile) {
    brochurePath = `/uploads/${brochureFile.filename}`;
  } else if (brochureUrl) {
    brochurePath = brochureUrl;
  }

  let parsedAmenities = existing.amenities;
  if (amenities !== undefined) {
    parsedAmenities = typeof amenities === 'string'
      ? amenities.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      : amenities;
  }

  let parsedAdvantages = existing.locationAdvantages;
  if (locationAdvantages !== undefined) {
    parsedAdvantages = typeof locationAdvantages === 'string'
      ? locationAdvantages.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      : locationAdvantages;
  }

  // Parse floorPlans array
  let updatedFloorPlans = existing.floorPlans || [];
  if (floorPlans !== undefined) {
    if (typeof floorPlans === 'string') {
      try {
        updatedFloorPlans = JSON.parse(floorPlans);
      } catch (e) {
        updatedFloorPlans = [];
      }
    } else if (Array.isArray(floorPlans)) {
      updatedFloorPlans = floorPlans;
    }
  }

  let updatedPriceList = priceList !== undefined ? priceList : (existing.priceList || '');
  if ((!updatedPriceList || !updatedPriceList.trim()) && updatedFloorPlans && updatedFloorPlans.length > 0) {
    updatedPriceList = updatedFloorPlans.map(fp => `${fp.title || 'Typical Floor Plan'}\n${fp.area || ''}\n${fp.price || ''}`).join('\n\n');
  }

  const updatedSlug = slug
    ? slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : (existing.slug || propName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

  let numericPrice = priceNumeric !== undefined ? parseFloat(priceNumeric) : existing.priceNumeric;
  if (isNaN(numericPrice) || numericPrice <= 0) {
    const match = ((price !== undefined ? price : existing.price) || '').match(/(\d+(?:\.\d+)?)/);
    numericPrice = match ? parseFloat(match[1]) : (existing.priceNumeric || 0);
  }

  properties[index] = {
    ...existing,
    slug: updatedSlug,
    name: propName,
    title: propName,
    developer: developer !== undefined ? developer : existing.developer,
    location: location !== undefined ? location : existing.location,
    city: city !== undefined ? city : existing.city,
    type: type !== undefined ? type : existing.type,
    price: price !== undefined ? price : existing.price,
    priceNumeric: numericPrice,
    bhk: bhk !== undefined ? bhk : existing.bhk,
    area: area !== undefined ? area : existing.area,
    totalArea: totalArea !== undefined ? totalArea : (existing.totalArea || ''),
    status: status !== undefined ? status : existing.status,
    possessionStatus: possessionStatus !== undefined ? possessionStatus : (existing.possessionStatus || existing.status || ''),
    reraNo: reraNo !== undefined ? reraNo : (existing.reraNo || ''),
    overlooking: overlooking !== undefined ? overlooking : (existing.overlooking || ''),
    carParking: carParking !== undefined ? carParking : (existing.carParking || ''),
    powerBackup: powerBackup !== undefined ? powerBackup : (existing.powerBackup || ''),
    image: imagePath,
    secondaryImage: secondaryImagePath,
    brochureUrl: brochurePath,
    featured: featured !== undefined ? (featured === 'true' || featured === true) : existing.featured,
    overview: overview !== undefined ? overview : (existing.overview || ''),
    amenities: parsedAmenities || [],
    floorPlans: updatedFloorPlans,
    priceList: updatedPriceList,
    specifications: specifications !== undefined ? specifications : (existing.specifications || ''),
    siteLayout: {
      image: siteLayoutImg,
      description: siteLayoutDesc !== undefined ? siteLayoutDesc : ((existing.siteLayout && existing.siteLayout.description) || '')
    },
    locationAdvantages: parsedAdvantages || [],
    updatedAt: new Date().toISOString()
  };

  writeData('properties.json', properties);
  res.json({ success: true, property: properties[index] });
} catch (err) {
  console.error('Error updating property:', err);
  res.status(500).json({ success: false, message: err.message || 'Error updating property' });
}
});

app.delete('/api/properties/:id', (req, res) => {
  try {
    const rawTarget = decodeURIComponent(req.params.id || '').trim();
    const target = rawTarget.toLowerCase();
    let properties = readData('properties.json');
    const beforeCount = properties.length;

    properties = properties.filter(p => {
      const pId = (p.id || '').toString().trim();
      const pSlug = (p.slug || '').toString().trim();
      const pNameSlug = (p.name || p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const match = pId === rawTarget ||
                    pId.toLowerCase() === target ||
                    pSlug === rawTarget ||
                    pSlug.toLowerCase() === target ||
                    pNameSlug === target;
      return !match;
    });

    if (properties.length === beforeCount) {
      console.warn(`[DELETE] Property not found for target: "${rawTarget}"`);
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    writeData('properties.json', properties);
    console.log(`[DELETE] Property "${rawTarget}" deleted successfully. Count: ${beforeCount} -> ${properties.length}`);
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (err) {
    console.error('Error in DELETE /api/properties/:id:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= LEADS APIs =================
app.get('/api/leads', (req, res) => {
  const leads = readData('leads.json');
  res.json(leads);
});

app.post('/api/leads', (req, res) => {
  const leads = readData('leads.json');
  const { name, email, phone, property, message } = req.body;

  if (!name || (!email && !phone)) {
    return res.status(400).json({ success: false, message: 'Name and either Email or Phone are required!' });
  }

  const newLead = {
    id: 'lead-' + Date.now(),
    name,
    email: email || '',
    phone: phone || '',
    property: property || 'General Advisory',
    message: message || '',
    status: 'New',
    createdAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  };

  leads.unshift(newLead);
  writeData('leads.json', leads);
  res.status(201).json({ success: true, message: 'Enquiry received successfully! Our team will connect with you.' });
});

app.patch('/api/leads/:id/status', (req, res) => {
  const leads = readData('leads.json');
  const lead = leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  lead.status = req.body.status || lead.status;
  writeData('leads.json', leads);
  res.json({ success: true, lead });
});

app.delete('/api/leads/:id', (req, res) => {
  let leads = readData('leads.json');
  leads = leads.filter(l => l.id !== req.params.id);
  writeData('leads.json', leads);
  res.json({ success: true, message: 'Lead deleted' });
});

// Express Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`  🌟 Golden Properties Server running on port ${PORT}`);
  console.log(`  🌐 Website:         http://localhost:${PORT}`);
  console.log(`  👑 Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`  🔑 Default Login:   Username: admin | Password: password123`);
  console.log(`=================================================\n`);
});
