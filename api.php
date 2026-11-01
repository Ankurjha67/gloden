<?php
/**
 * Golden Properties - Lightweight PHP API Bridge for cPanel / Shared Hosting
 * Emulates the Node.js Express endpoints (auth, properties, blogs, leads, stats)
 * Handles file uploads to /uploads/ and stores records in /data/*.json
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('BASE_DIR', __DIR__);
define('DATA_DIR', BASE_DIR . '/data');
define('UPLOADS_DIR', BASE_DIR . '/uploads');

if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
if (!is_dir(UPLOADS_DIR)) @mkdir(UPLOADS_DIR, 0755, true);

function readData($file) {
    $path = DATA_DIR . '/' . $file;
    if (!file_exists($path)) return [];
    $raw = @file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function writeData($file, $data) {
    $path = DATA_DIR . '/' . $file;
    return @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function handleUpload($fileKey) {
    if (!isset($_FILES[$fileKey]) || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    $tmpName = $_FILES[$fileKey]['tmp_name'];
    $origName = $_FILES[$fileKey]['name'];
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf', 'doc', 'docx'];
    if (!in_array($ext, $allowed)) {
        return null;
    }
    $filename = round(microtime(true) * 1000) . '-' . mt_rand(100000000, 999999999) . '.' . $ext;
    $dest = UPLOADS_DIR . '/' . $filename;
    if (@move_uploaded_file($tmpName, $dest)) {
        return '/uploads/' . $filename;
    }
    return null;
}

// Extract Route and Method
$method = $_SERVER['REQUEST_METHOD'];
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';

if (empty($route)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $uri = preg_replace('#^/api/?#i', '', $uri);
    $route = trim($uri, '/');
}

// Parse body (JSON or $_POST)
$inputJSON = [];
$rawBody = file_get_contents('php://input');
if (!empty($rawBody)) {
    $parsed = json_decode($rawBody, true);
    if (is_array($parsed)) $inputJSON = $parsed;
}
$body = array_merge($inputJSON, $_POST);

// ==========================================
// 1. AUTH APIs
// ==========================================
if ($route === 'auth/login' && $method === 'POST') {
    $admin = readData('admin.json');
    $user = isset($body['username']) ? trim($body['username']) : '';
    $pass = isset($body['password']) ? trim($body['password']) : '';

    if ($user === ($admin['username'] ?? '') && $pass === ($admin['password'] ?? '')) {
        echo json_encode([
            'success' => true,
            'token' => 'golden-token-' . round(microtime(true) * 1000),
            'username' => $admin['username']
        ]);
        exit;
    }
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid Username or Password!']);
    exit;
}

if ($route === 'auth/change-password' && $method === 'POST') {
    $admin = readData('admin.json');
    $current = isset($body['currentPassword']) ? $body['currentPassword'] : '';
    $newPass = isset($body['newPassword']) ? $body['newPassword'] : '';
    $newUser = isset($body['newUsername']) ? $body['newUsername'] : '';

    if ($current !== ($admin['password'] ?? '')) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Current password is incorrect!']);
        exit;
    }

    if (!empty($newPass)) $admin['password'] = $newPass;
    if (!empty($newUser)) $admin['username'] = $newUser;
    writeData('admin.json', $admin);

    echo json_encode(['success' => true, 'message' => 'Admin credentials updated successfully!']);
    exit;
}

// ==========================================
// 2. STATS API
// ==========================================
if ($route === 'stats' && $method === 'GET') {
    $blogs = readData('blogs.json');
    $props = readData('properties.json');
    $leads = readData('leads.json');
    $newCount = 0;
    foreach ($leads as $l) {
        if (($l['status'] ?? '') === 'New') $newCount++;
    }

    echo json_encode([
        'totalBlogs' => count($blogs),
        'totalProperties' => count($props),
        'totalLeads' => count($leads),
        'newLeads' => $newCount
    ]);
    exit;
}

// ==========================================
// 3. PROPERTIES APIs
// ==========================================
if ($route === 'properties' || preg_match('#^properties/(.+)$#', $route, $matches)) {
    $propId = isset($matches[1]) ? urldecode($matches[1]) : null;
    $properties = readData('properties.json');

    // GET /api/properties
    if ($method === 'GET' && !$propId) {
        echo json_encode($properties);
        exit;
    }

    // GET /api/properties/:id
    if ($method === 'GET' && $propId) {
        $target = strtolower(trim($propId));
        foreach ($properties as $p) {
            $pId = strtolower($p['id'] ?? '');
            $pSlug = strtolower($p['slug'] ?? '');
            $pNameSlug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', ($p['name'] ?? $p['title'] ?? '')), '-'));
            if ($pId === $target || $pSlug === $target || $pNameSlug === $target) {
                echo json_encode($p);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['message' => 'Property not found']);
        exit;
    }

    // POST /api/properties (Create)
    if ($method === 'POST' && !$propId) {
        $name = trim($body['name'] ?? $body['title'] ?? 'Landmark Residence');
        $slug = trim($body['slug'] ?? '');
        if (empty($slug)) {
            $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name), '-'));
        }

        // Upload files
        $imgUpload = handleUpload('imageFile');
        $secUpload = handleUpload('secondaryImageFile');
        $siteUpload = handleUpload('siteLayoutFile');
        $broUpload = handleUpload('brochureFile');

        $mainImg = $imgUpload ?: ($body['imageUrl'] ?? 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80');
        $secImg = $secUpload ?: ($body['secondaryImageUrl'] ?? '');
        $siteImg = $siteUpload ?: ($body['siteLayoutUrl'] ?? '');
        $broUrl = $broUpload ?: ($body['brochureUrl'] ?? '');

        // Parse amenities
        $amenities = $body['amenities'] ?? [];
        if (is_string($amenities)) {
            $amenities = array_values(array_filter(array_map('trim', preg_split('/[\n,]+/', $amenities))));
        }

        // Parse location advantages
        $advantages = $body['locationAdvantages'] ?? [];
        if (is_string($advantages)) {
            $advantages = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $advantages))));
        }

        // Parse floor plans
        $floorPlans = [];
        if (isset($body['floorPlans'])) {
            if (is_string($body['floorPlans'])) {
                $dec = json_decode($body['floorPlans'], true);
                if (is_array($dec)) $floorPlans = $dec;
            } elseif (is_array($body['floorPlans'])) {
                $floorPlans = $body['floorPlans'];
            }
        }

        $priceList = $body['priceList'] ?? '';
        if (empty(trim($priceList)) && !empty($floorPlans)) {
            $lines = [];
            foreach ($floorPlans as $fp) {
                $lines[] = ($fp['title'] ?? 'Typical Floor Plan') . "\n" . ($fp['area'] ?? '') . "\n" . ($fp['price'] ?? '');
            }
            $priceList = implode("\n\n", $lines);
        }

        $numericPrice = floatval($body['priceNumeric'] ?? 0);
        if ($numericPrice <= 0 && !empty($body['price'])) {
            if (preg_match('/(\d+(?:\.\d+)?)/', $body['price'], $m)) {
                $numericPrice = floatval($m[1]);
            }
        }

        $newProp = [
            'id' => (string) round(microtime(true) * 1000),
            'name' => $name,
            'title' => $name,
            'slug' => $slug,
            'developer' => trim($body['developer'] ?? 'Golden Developers'),
            'location' => trim($body['location'] ?? 'Delhi NCR'),
            'city' => trim($body['city'] ?? 'Gurugram'),
            'type' => trim($body['type'] ?? 'Residential'),
            'price' => trim($body['price'] ?? '₹ On Request'),
            'priceNumeric' => $numericPrice,
            'bhk' => trim($body['bhk'] ?? '3,4 BHK'),
            'area' => trim($body['area'] ?? ''),
            'totalArea' => trim($body['totalArea'] ?? ''),
            'status' => trim($body['status'] ?? 'Ready To Move In'),
            'possessionStatus' => trim($body['possessionStatus'] ?? ($body['status'] ?? 'Ready To Move In')),
            'reraNo' => trim($body['reraNo'] ?? ''),
            'overlooking' => trim($body['overlooking'] ?? 'Landscaped Green Parks'),
            'carParking' => trim($body['carParking'] ?? 'Reserved Covered Parking'),
            'powerBackup' => trim($body['powerBackup'] ?? '100% 24x7 Power Backup'),
            'featured' => (!empty($body['featured']) && ($body['featured'] === 'true' || $body['featured'] === true || $body['featured'] === '1')),
            'image' => $mainImg,
            'secondaryImage' => $secImg,
            'brochureUrl' => $broUrl,
            'overview' => trim($body['overview'] ?? ''),
            'amenities' => $amenities,
            'priceList' => $priceList,
            'floorPlans' => $floorPlans,
            'specifications' => trim($body['specifications'] ?? ''),
            'siteLayout' => [
                'image' => $siteImg,
                'description' => trim($body['siteLayoutDesc'] ?? 'Master site blueprint & layout architecture.')
            ],
            'locationAdvantages' => $advantages,
            'createdAt' => date('c')
        ];

        array_unshift($properties, $newProp);
        writeData('properties.json', $properties);

        echo json_encode(['success' => true, 'property' => $newProp]);
        exit;
    }

    // PUT or POST with ID (Update)
    if (($method === 'PUT' || $method === 'POST') && $propId) {
        $index = -1;
        $target = strtolower(trim($propId));
        foreach ($properties as $i => $p) {
            $pId = strtolower($p['id'] ?? '');
            $pSlug = strtolower($p['slug'] ?? '');
            if ($pId === $target || $pSlug === $target) {
                $index = $i;
                break;
            }
        }

        if ($index === -1) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Property not found']);
            exit;
        }

        $existing = $properties[$index];

        $imgUpload = handleUpload('imageFile');
        $secUpload = handleUpload('secondaryImageFile');
        $siteUpload = handleUpload('siteLayoutFile');
        $broUpload = handleUpload('brochureFile');

        $mainImg = $imgUpload ?: (!empty($body['imageUrl']) ? $body['imageUrl'] : ($existing['image'] ?? ''));
        $secImg = $secUpload ?: (!empty($body['secondaryImageUrl']) ? $body['secondaryImageUrl'] : ($existing['secondaryImage'] ?? ''));
        $siteImg = $siteUpload ?: (!empty($body['siteLayoutUrl']) ? $body['siteLayoutUrl'] : ($existing['siteLayout']['image'] ?? ''));
        $broUrl = $broUpload ?: (!empty($body['brochureUrl']) ? $body['brochureUrl'] : ($existing['brochureUrl'] ?? ''));

        $amenities = isset($body['amenities']) ? $body['amenities'] : ($existing['amenities'] ?? []);
        if (is_string($amenities)) {
            $amenities = array_values(array_filter(array_map('trim', preg_split('/[\n,]+/', $amenities))));
        }

        $advantages = isset($body['locationAdvantages']) ? $body['locationAdvantages'] : ($existing['locationAdvantages'] ?? []);
        if (is_string($advantages)) {
            $advantages = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $advantages))));
        }

        $floorPlans = $existing['floorPlans'] ?? [];
        if (isset($body['floorPlans'])) {
            if (is_string($body['floorPlans'])) {
                $dec = json_decode($body['floorPlans'], true);
                if (is_array($dec)) $floorPlans = $dec;
            } elseif (is_array($body['floorPlans'])) {
                $floorPlans = $body['floorPlans'];
            }
        }

        $propName = trim($body['name'] ?? $body['title'] ?? ($existing['name'] ?? 'Landmark Residence'));
        $slug = trim($body['slug'] ?? ($existing['slug'] ?? ''));
        if (empty($slug)) {
            $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $propName), '-'));
        }

        $updated = array_merge($existing, [
            'name' => $propName,
            'title' => $propName,
            'slug' => $slug,
            'developer' => trim($body['developer'] ?? ($existing['developer'] ?? '')),
            'location' => trim($body['location'] ?? ($existing['location'] ?? '')),
            'city' => trim($body['city'] ?? ($existing['city'] ?? 'Gurugram')),
            'type' => trim($body['type'] ?? ($existing['type'] ?? 'Residential')),
            'price' => trim($body['price'] ?? ($existing['price'] ?? '')),
            'priceNumeric' => isset($body['priceNumeric']) ? floatval($body['priceNumeric']) : ($existing['priceNumeric'] ?? 0),
            'bhk' => trim($body['bhk'] ?? ($existing['bhk'] ?? '')),
            'area' => trim($body['area'] ?? ($existing['area'] ?? '')),
            'totalArea' => trim($body['totalArea'] ?? ($existing['totalArea'] ?? '')),
            'status' => trim($body['status'] ?? ($existing['status'] ?? '')),
            'possessionStatus' => trim($body['possessionStatus'] ?? ($existing['possessionStatus'] ?? '')),
            'reraNo' => trim($body['reraNo'] ?? ($existing['reraNo'] ?? '')),
            'overlooking' => trim($body['overlooking'] ?? ($existing['overlooking'] ?? '')),
            'carParking' => trim($body['carParking'] ?? ($existing['carParking'] ?? '')),
            'powerBackup' => trim($body['powerBackup'] ?? ($existing['powerBackup'] ?? '')),
            'featured' => isset($body['featured']) ? ($body['featured'] === 'true' || $body['featured'] === true || $body['featured'] === '1') : ($existing['featured'] ?? false),
            'image' => $mainImg,
            'secondaryImage' => $secImg,
            'brochureUrl' => $broUrl,
            'overview' => trim($body['overview'] ?? ($existing['overview'] ?? '')),
            'amenities' => $amenities,
            'priceList' => $body['priceList'] ?? ($existing['priceList'] ?? ''),
            'floorPlans' => $floorPlans,
            'specifications' => trim($body['specifications'] ?? ($existing['specifications'] ?? '')),
            'siteLayout' => [
                'image' => $siteImg,
                'description' => trim($body['siteLayoutDesc'] ?? ($existing['siteLayout']['description'] ?? ''))
            ],
            'locationAdvantages' => $advantages,
            'updatedAt' => date('c')
        ]);

        $properties[$index] = $updated;
        writeData('properties.json', $properties);

        echo json_encode(['success' => true, 'property' => $updated]);
        exit;
    }

    // DELETE /api/properties/:id
    if ($method === 'DELETE' && $propId) {
        $target = strtolower(trim($propId));
        $before = count($properties);
        $properties = array_values(array_filter($properties, function($p) use ($target) {
            $pId = strtolower($p['id'] ?? '');
            $pSlug = strtolower($p['slug'] ?? '');
            return $pId !== $target && $pSlug !== $target;
        }));

        if (count($properties) === $before) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Property not found']);
            exit;
        }

        writeData('properties.json', $properties);
        echo json_encode(['success' => true, 'message' => 'Property deleted successfully']);
        exit;
    }
}

// ==========================================
// 4. LEADS APIs
// ==========================================
if ($route === 'leads' || preg_match('#^leads/(.+?)(?:/(status))?$#', $route, $matches)) {
    $leadId = isset($matches[1]) ? urldecode($matches[1]) : null;
    $isStatusOnly = !empty($matches[2]);
    $leads = readData('leads.json');

    if ($method === 'GET') {
        echo json_encode($leads);
        exit;
    }

    if ($method === 'POST' && !$leadId) {
        $newLead = [
            'id' => (string) round(microtime(true) * 1000),
            'name' => trim($body['name'] ?? ''),
            'phone' => trim($body['phone'] ?? ''),
            'email' => trim($body['email'] ?? ''),
            'property' => trim($body['property'] ?? ''),
            'tourType' => trim($body['tourType'] ?? 'In-Person Site Visit'),
            'message' => trim($body['message'] ?? ''),
            'status' => 'New',
            'createdAt' => date('c')
        ];
        array_unshift($leads, $newLead);
        writeData('leads.json', $leads);
        echo json_encode(['success' => true, 'lead' => $newLead]);
        exit;
    }

    if (($method === 'PATCH' || $method === 'PUT' || $method === 'POST') && $leadId) {
        foreach ($leads as &$l) {
            if (($l['id'] ?? '') === $leadId) {
                if (isset($body['status'])) $l['status'] = $body['status'];
                writeData('leads.json', $leads);
                echo json_encode(['success' => true, 'lead' => $l]);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Lead not found']);
        exit;
    }

    if ($method === 'DELETE' && $leadId) {
        $leads = array_values(array_filter($leads, function($l) use ($leadId) {
            return ($l['id'] ?? '') !== $leadId;
        }));
        writeData('leads.json', $leads);
        echo json_encode(['success' => true, 'message' => 'Lead deleted']);
        exit;
    }
}

// ==========================================
// 5. BLOGS APIs
// ==========================================
if ($route === 'blogs' || preg_match('#^blogs/(.+)$#', $route, $matches)) {
    $blogId = isset($matches[1]) ? urldecode($matches[1]) : null;
    $blogs = readData('blogs.json');

    if ($method === 'GET' && !$blogId) {
        echo json_encode($blogs);
        exit;
    }

    if ($method === 'GET' && $blogId) {
        foreach ($blogs as $b) {
            if (($b['id'] ?? '') === $blogId || ($b['slug'] ?? '') === $blogId) {
                echo json_encode($b);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['message' => 'Blog not found']);
        exit;
    }

    if ($method === 'POST' && !$blogId) {
        $cover = handleUpload('imageFile');
        $newBlog = [
            'id' => (string) round(microtime(true) * 1000),
            'title' => trim($body['title'] ?? ''),
            'category' => trim($body['category'] ?? 'Trends'),
            'date' => date('d M Y'),
            'author' => trim($body['author'] ?? 'Golden Advisory Desk'),
            'readTime' => trim($body['readTime'] ?? '4 Min Read'),
            'badge' => trim($body['badge'] ?? ''),
            'subLocation' => trim($body['subLocation'] ?? ''),
            'excerpt' => trim($body['excerpt'] ?? ''),
            'content' => trim($body['content'] ?? ''),
            'image' => $cover ?: ($body['imageUrl'] ?? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80'),
            'featured' => (!empty($body['featured']) && ($body['featured'] === 'true' || $body['featured'] === true || $body['featured'] === '1')),
            'createdAt' => date('c')
        ];
        array_unshift($blogs, $newBlog);
        writeData('blogs.json', $blogs);
        echo json_encode(['success' => true, 'blog' => $newBlog]);
        exit;
    }

    if ($method === 'DELETE' && $blogId) {
        $blogs = array_values(array_filter($blogs, function($b) use ($blogId) {
            return ($b['id'] ?? '') !== $blogId && ($b['slug'] ?? '') !== $blogId;
        }));
        writeData('blogs.json', $blogs);
        echo json_encode(['success' => true, 'message' => 'Blog deleted successfully']);
        exit;
    }
}

// Fallback
http_response_code(404);
echo json_encode(['success' => false, 'message' => 'Route not found: ' . $route]);
exit;
