#!/bin/bash
# Script untuk menyiapkan folder siap upload ke cPanel
# Jalankan: bash deploy.sh

set -e

DEPLOY_DIR="deploy_cpanel"

echo "Membersihkan folder deploy lama..."
rm -rf $DEPLOY_DIR

echo "Menyalin standalone output..."
cp -r .next/standalone $DEPLOY_DIR

echo "Menyalin static assets..."
mkdir -p $DEPLOY_DIR/.next
cp -r .next/static $DEPLOY_DIR/.next/static
cp -r public $DEPLOY_DIR/public

echo "Menyalin entry point Passenger..."
cp app.js $DEPLOY_DIR/app.js

echo ""
echo "✓ Selesai! Folder '$DEPLOY_DIR' siap diupload ke cPanel."
echo ""
echo "Langkah selanjutnya:"
echo "  1. Upload isi folder '$DEPLOY_DIR' ke direktori di cPanel (misal: public_html/arcthogus)"
echo "  2. Di cPanel > Setup Node.js App:"
echo "     - Node.js version : 18.x atau 20.x"
echo "     - Application root: /home/<user>/public_html/arcthogus"
echo "     - Startup file    : app.js"
echo "  3. Tambahkan environment variables (lihat .env.local.example)"
echo "  4. Klik 'Run NPM Install' lalu 'Restart'"
