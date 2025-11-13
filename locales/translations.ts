export type Language = 'en' | 'tr' | 'fr';

export const translations = {
  en: {
    // General
    'save': 'Save',
    'cancel': 'Cancel',
    'add': 'Add',
    'edit': 'Edit',
    'delete': 'Delete',
    'close': 'Close',
    'name': 'Name',
    'status': 'Status',
    'role': 'Role',
    'actions': 'Actions',
    'active': 'Active',
    'inactive': 'Inactive',
    'price': 'Price',
    'description': 'Description',
    'category': 'Category',
    'availability': 'Availability',
    'available': 'Available',
    'unavailable': 'Unavailable',
    // FIX: Add missing 'users' translation key
    'users': 'Users',
    
    // Login
    'signIn': 'Sign In',
    'email': 'Email',
    'password': 'Password',
    'loginFailed': 'Login failed. Please check your credentials.',
    'welcomeToOrdo': 'Welcome to Ordo',
    
    // Roles
    'SUPER_ADMIN': 'Super Admin',
    'ADMIN': 'Admin',
    'WAITER': 'Waiter',
    'KITCHEN': 'Kitchen',

    // Header
    'logout': 'Logout',
    
    // Waiter Dashboard
    'tables': 'Tables',
    'startNewOrder': 'Start New Order',
    'viewOrder': 'View Order',
    'currentOrder': 'Current Order',
    'sendToKitchen': 'Send to Kitchen',
    'total': 'Total',
    'notes': 'Notes',
    'addNote': 'Add a note...',
    'quantity': 'Qty',
    'orderSent': 'Order sent to kitchen!',
    'serve': 'Serve',
    'served': 'Served',
    // FIX: Add missing 'serveOrder' and 'closeTable' translation keys
    'serveOrder': 'Serve All Items',
    'closeTable': 'Close Table',
    
    // Kitchen Dashboard
    'kitchenDashboard': 'Kitchen Dashboard',
    'activeOrders': 'Active Orders',
    'order': 'Order',
    'table': 'Table',
    'markAllReady': 'Mark All Ready',
    
    // Admin Dashboard
    'adminDashboard': 'Admin Dashboard',
    'tablesManagement': 'Tables Management',
    'menuManagement': 'Menu Management',
    'usersManagement': 'Users Management',
    'addTable': 'Add Table',
    'editTable': 'Edit Table',
    'tableName': 'Table Name',
    'addCategory': 'Add Category',
    'editCategory': 'Edit Category',
    'categoryName': 'Category Name',
    'addMenuItem': 'Add Menu Item',
    'editMenuItem': 'Edit Menu Item',
    'menuItemName': 'Menu Item Name',
    'addUser': 'Add User',
    'editUser': 'Edit User',
    'fullName': 'Full Name',
    'passwordOptional': 'Password (leave blank to not change)',

    // Statuses
    'FREE': 'Free',
    'OCCUPIED': 'Occupied',
    'CLOSED': 'Closed',
    'NEW': 'New',
    'IN_PREPARATION': 'In Preparation',
    'READY': 'Ready',
    'SERVED': 'Served',
    'CANCELED': 'Canceled',
    
    // Super Admin
    'superAdminDashboard': 'Super Admin Dashboard',
    'tenants': 'Tenants',
    'subscription': 'Subscription',
    'registeredOn': 'Registered On',
    'viewUsers': 'View Users',
    'TRIAL': 'Trial',
    'ACTIVE': 'Active',
    'CANCELED_SUB': 'Canceled',
    'tenantUsers': 'Tenant Users',
  },
  tr: {
    // General
    'save': 'Kaydet',
    'cancel': 'İptal',
    'add': 'Ekle',
    'edit': 'Düzenle',
    'delete': 'Sil',
    'close': 'Kapat',
    'name': 'İsim',
    'status': 'Durum',
    'role': 'Rol',
    'actions': 'İşlemler',
    'active': 'Aktif',
    'inactive': 'Pasif',
    'price': 'Fiyat',
    'description': 'Açıklama',
    'category': 'Kategori',
    'availability': 'Müsaitlik',
    'available': 'Müsait',
    'unavailable': 'Müsait Değil',
    // FIX: Add missing 'users' translation key
    'users': 'Kullanıcılar',

    // Login
    'signIn': 'Giriş Yap',
    'email': 'E-posta',
    'password': 'Şifre',
    'loginFailed': 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.',
    'welcomeToOrdo': 'Ordo\'ya Hoş Geldiniz',

    // Roles
    'SUPER_ADMIN': 'Süper Yönetici',
    'ADMIN': 'Yönetici',
    'WAITER': 'Garson',
    'KITCHEN': 'Mutfak',

    // Header
    'logout': 'Çıkış Yap',

    // Waiter Dashboard
    'tables': 'Masalar',
    'startNewOrder': 'Yeni Sipariş Başlat',
    'viewOrder': 'Siparişi Görüntüle',
    'currentOrder': 'Mevcut Sipariş',
    'sendToKitchen': 'Mutfağa Gönder',
    'total': 'Toplam',
    'notes': 'Notlar',
    'addNote': 'Not ekle...',
    'quantity': 'Adet',
    'orderSent': 'Sipariş mutfağa gönderildi!',
    'serve': 'Servis Et',
    'served': 'Servis Edildi',
    // FIX: Add missing 'serveOrder' and 'closeTable' translation keys
    'serveOrder': 'Tümünü Servis Et',
    'closeTable': 'Masayı Kapat',

    // Kitchen Dashboard
    'kitchenDashboard': 'Mutfak Ekranı',
    'activeOrders': 'Aktif Siparişler',
    'order': 'Sipariş',
    'table': 'Masa',
    'markAllReady': 'Tümünü Hazır Olarak İşaretle',

    // Admin Dashboard
    'adminDashboard': 'Yönetici Paneli',
    'tablesManagement': 'Masa Yönetimi',
    'menuManagement': 'Menü Yönetimi',
    'usersManagement': 'Kullanıcı Yönetimi',
    'addTable': 'Masa Ekle',
    'editTable': 'Masayı Düzenle',
    'tableName': 'Masa Adı',
    'addCategory': 'Kategori Ekle',
    'editCategory': 'Kategoriyi Düzenle',
    'categoryName': 'Kategori Adı',
    'addMenuItem': 'Menü Öğesi Ekle',
    'editMenuItem': 'Menü Öğesini Düzenle',
    'menuItemName': 'Menü Öğesi Adı',
    'addUser': 'Kullanıcı Ekle',
    'editUser': 'Kullanıcıyı Düzenle',
    'fullName': 'Tam Ad',
    'passwordOptional': 'Şifre (değiştirmek istemiyorsanız boş bırakın)',

    // Statuses
    'FREE': 'Boş',
    'OCCUPIED': 'Dolu',
    'CLOSED': 'Kapalı',
    'NEW': 'Yeni',
    'IN_PREPARATION': 'Hazırlanıyor',
    'READY': 'Hazır',
    'SERVED': 'Servis Edildi',
    'CANCELED': 'İptal Edildi',
    
    // Super Admin
    'superAdminDashboard': 'Süper Yönetici Paneli',
    'tenants': 'Restoranlar',
    'subscription': 'Abonelik',
    'registeredOn': 'Kayıt Tarihi',
    'viewUsers': 'Kullanıcıları Görüntüle',
    'TRIAL': 'Deneme',
    'ACTIVE': 'Aktif',
    'CANCELED_SUB': 'İptal Edilmiş',
    'tenantUsers': 'Restoran Kullanıcıları',
  },
  fr: {
    // General
    'save': 'Enregistrer',
    'cancel': 'Annuler',
    'add': 'Ajouter',
    'edit': 'Modifier',
    'delete': 'Supprimer',
    'close': 'Fermer',
    'name': 'Nom',
    'status': 'Statut',
    'role': 'Rôle',
    'actions': 'Actions',
    'active': 'Actif',
    'inactive': 'Inactif',
    'price': 'Prix',
    'description': 'Description',
    'category': 'Catégorie',
    'availability': 'Disponibilité',
    'available': 'Disponible',
    'unavailable': 'Indisponible',
    // FIX: Add missing 'users' translation key
    'users': 'Utilisateurs',
    
    // Login
    'signIn': 'Se connecter',
    'email': 'E-mail',
    'password': 'Mot de passe',
    'loginFailed': 'Échec de la connexion. Veuillez vérifier vos identifiants.',
    'welcomeToOrdo': 'Bienvenue chez Ordo',

    // Roles
    'SUPER_ADMIN': 'Super Admin',
    'ADMIN': 'Admin',
    'WAITER': 'Serveur',
    'KITCHEN': 'Cuisine',

    // Header
    'logout': 'Déconnexion',
    
    // Waiter Dashboard
    'tables': 'Tables',
    'startNewOrder': 'Nouvelle Commande',
    'viewOrder': 'Voir la Commande',
    'currentOrder': 'Commande Actuelle',
    'sendToKitchen': 'Envoyer en Cuisine',
    'total': 'Total',
    'notes': 'Notes',
    'addNote': 'Ajouter une note...',
    'quantity': 'Qté',
    'orderSent': 'Commande envoyée en cuisine !',
    'serve': 'Servir',
    'served': 'Servi',
    // FIX: Add missing 'serveOrder' and 'closeTable' translation keys
    'serveOrder': 'Tout Servir',
    'closeTable': 'Fermer la Table',
    
    // Kitchen Dashboard
    'kitchenDashboard': 'Tableau de Bord Cuisine',
    'activeOrders': 'Commandes Actives',
    'order': 'Commande',
    'table': 'Table',
    'markAllReady': 'Marquer Tout Prêt',
    
    // Admin Dashboard
    'adminDashboard': 'Panneau d\'Administration',
    'tablesManagement': 'Gestion des Tables',
    'menuManagement': 'Gestion du Menu',
    'usersManagement': 'Gestion des Utilisateurs',
    'addTable': 'Ajouter une Table',
    'editTable': 'Modifier la Table',
    'tableName': 'Nom de la Table',
    'addCategory': 'Ajouter une Catégorie',
    'editCategory': 'Modifier la Catégorie',
    'categoryName': 'Nom de la Catégorie',
    'addMenuItem': 'Ajouter un Plat',
    'editMenuItem': 'Modifier le Plat',
    'menuItemName': 'Nom du Plat',
    'addUser': 'Ajouter un Utilisateur',
    'editUser': 'Modifier l\'Utilisateur',
    'fullName': 'Nom Complet',
    'passwordOptional': 'Mot de passe (laisser vide pour ne pas changer)',

    // Statuses
    'FREE': 'Libre',
    'OCCUPIED': 'Occupée',
    'CLOSED': 'Fermée',
    'NEW': 'Nouveau',
    'IN_PREPARATION': 'En Préparation',
    'READY': 'Prêt',
    'SERVED': 'Servi',
    'CANCELED': 'Annulé',

    // Super Admin
    'superAdminDashboard': 'Tableau de Bord Super Admin',
    'tenants': 'Tenants',
    'subscription': 'Abonnement',
    'registeredOn': 'Inscrit le',
    'viewUsers': 'Voir les Utilisateurs',
    'TRIAL': 'Essai',
    'ACTIVE': 'Actif',
    'CANCELED_SUB': 'Annulé',
    'tenantUsers': 'Utilisateurs du Tenant',
  },
};

export type TranslationKey = keyof typeof translations.en;