import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { updateSettingsSection } from '../services/settings';

const LanguageContext = createContext(null);

export const languageOptions = [
  { code: 'vi', label: 'Tiếng Việt', nativeLabel: 'Tiếng Việt' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
];

const dictionaries = {
  vi: {
    app: {
      inbox: 'Hộp thư',
      messages: 'Tin nhắn',
      notifications: 'Thông báo',
      settings: 'Cài đặt',
      search: 'Tìm kiếm',
      searchMessages: 'Tìm tin nhắn...',
      people: 'Mọi người',
    },
    auth: {
      createAccount: 'Tạo tài khoản',
      createAccountHint: 'Tạo tài khoản mới để bắt đầu với KaijuMess.',
      emailAddress: 'Địa chỉ email',
      forgotPassword: 'Quên mật khẩu?',
      fullName: 'Họ và tên',
      login: 'Đăng nhập',
      loginGoogle: 'Đăng nhập với Google',
      password: 'Mật khẩu',
      rememberMe: 'Ghi nhớ tôi',
      signUp: 'Đăng ký',
      welcomeBack: 'Chào mừng trở lại',
      welcomeHint: 'Rất vui khi gặp lại bạn!',
    },
    settings: {
      account: 'Tài khoản',
      appearance: 'Giao diện',
      descAccount: 'Thông tin tài khoản, phiên đăng nhập và 2FA',
      descAppearance: 'Theme, hình nền, blur và cỡ chữ',
      descLanguage: 'Đổi ngôn ngữ ứng dụng và đồng bộ với tài khoản',
      descNotifications: 'Thông báo đẩy, banner, âm thanh và giờ yên lặng',
      descOverview: 'Tổng quan các cài đặt quan trọng cho tài khoản',
      descPrivacy: 'Hiển thị, danh sách chặn và bảo mật',
      descProfile: 'Trang hồ sơ, media và thông tin công khai',
      language: 'Ngôn ngữ',
      languageDesc: 'Đổi ngôn ngữ ứng dụng trên thiết bị này và đồng bộ vào tài khoản.',
      notifications: 'Thông báo',
      overview: 'Tổng quan',
      privacy: 'Riêng tư',
      profile: 'Hồ sơ',
      settings: 'Cài đặt',
      support: 'Hỗ trợ',
      currentLanguage: 'Ngôn ngữ hiện tại',
      saveLanguageSuccess: 'Đã cập nhật ngôn ngữ ứng dụng.',
      backToChat: 'Quay lại chat',
      logout: 'Đăng xuất',
      helpCenter: 'Trung tâm trợ giúp',
      aboutApp: 'Về KaijuMess',
      security: 'Bảo mật',
      fontSize: 'Cỡ chữ',
      pushNotifications: 'Thông báo đẩy',
      soundHapticsShort: 'Âm thanh & rung',
      light: 'Sáng',
      dark: 'Tối',
      system: 'Hệ thống',
      auto: 'Tự động',
      themeMode: 'Chế độ giao diện',
      chatWallpaper: 'Hình nền chat',
      clear: 'Xóa',
      seeAll: 'Xem tất cả',
      notificationsHero: 'Cá nhân hóa thông báo',
      messageNotifications: 'Thông báo tin nhắn',
      groupNotifications: 'Thông báo nhóm',
      appSounds: 'Âm thanh & rung trong ứng dụng',
      active: 'Đang bật',
      muted: 'Đã tắt',
      showPreviews: 'Hiển thị bản xem trước',
      displayMessageText: 'Hiển thị nội dung tin nhắn trong cảnh báo',
      alertStyle: 'Kiểu cảnh báo',
      groupAlerts: 'Thông báo nhóm',
      groupAlertsDesc: 'Nhận thông báo khi có tin nhắn mới',
      muteMentions: 'Tắt thông báo nhắc tên',
      muteMentionsDesc: 'Bỏ qua @thông_báo trong nhóm',
      inAppSounds: 'Âm thanh trong ứng dụng',
      inAppVibrate: 'Rung trong ứng dụng',
      soundHaptics: 'Âm thanh & phản hồi rung',
      profileBio: 'Tiểu sử',
      network: 'Mạng lưới',
      sendMessage: 'Gửi tin nhắn',
      privacySecurity: 'Riêng tư & bảo mật',
      protectedAccount: 'Tài khoản được bảo vệ',
      connectedAccount: 'Tài khoản đã kết nối',
    },
    people: {
      friends: 'Đã là bạn',
      received: 'Lời mời',
      sent: 'Đã gửi',
      findPeople: 'Tìm người',
      searchByNameOrEmail: 'Tìm theo tên hoặc email',
      searchPlaceholder: 'Nhập tên đầy đủ, username hoặc email',
      recentFriends: 'Bạn bè gần đây',
      sentRequests: 'Lời mời đã gửi',
      receivedRequests: 'Lời mời kết bạn',
      searching: 'Đang tìm người dùng...',
      noMatches: 'Không tìm thấy tài khoản phù hợp.',
      systemResults: 'Kết quả tìm kiếm toàn hệ thống',
    },
    calls: {
      title: 'Cuộc gọi gần đây',
      loading: 'Đang tải lịch sử cuộc gọi...',
      empty: 'Không có cuộc gọi nào trong phạm vi hiện tại.',
      loadingMore: 'Đang tải thêm cuộc gọi...',
      summaryDefault: 'Đang hiển thị 15 cuộc gọi gần nhất. Cuộn xuống để tải thêm từng lô tiếp theo.',
      summaryFiltered: 'Đang hiển thị 15 cuộc gọi gần nhất trong phạm vi lọc hiện tại. Cuộn tiếp để tải thêm.',
      incoming: 'Cuộc gọi đến',
      outgoing: 'Cuộc gọi đi',
      openConversation: 'Mở cuộc trò chuyện',
      searchPlaceholder: 'Tìm theo tên hoặc email',
      recentLabel: 'Cuộc gọi',
      noDuration: 'Không có thời lượng',
      incomingStatus: 'Đến',
      outgoingStatus: 'Đi',
      missed: 'Nhỡ',
      rejected: 'Từ chối',
      busy: 'Bận',
    },
    notifications: {
      allActivity: 'Tất cả',
      friendInvitations: 'Lời mời kết bạn',
      groupInvitations: 'Lời mời nhóm',
      mentions: 'Nhắc đến',
      noMatches: 'Không có thông báo phù hợp.',
      unread: 'Chưa đọc',
      exit: 'Thoát',
      markAllRead: 'Đánh dấu đã đọc',
      searchPlaceholder: 'Tìm thông báo...',
      title: 'Thông báo',
      unreadNow: 'Bạn có {count} thông báo chưa đọc.',
    },
  },
  en: {
      app: { inbox: 'Inbox', messages: 'Messages', notifications: 'Notifications', settings: 'Settings', search: 'Search', searchMessages: 'Search messages...', people: 'People' },
    auth: {
      createAccount: 'Create account',
      createAccountHint: 'Create a new account to start with KaijuMess.',
      emailAddress: 'Email Address',
      forgotPassword: 'Forgot Password?',
      fullName: 'Full Name',
      login: 'Login',
      loginGoogle: 'Login with Google',
      password: 'Password',
      rememberMe: 'Remember Me',
      signUp: 'Sign up',
      welcomeBack: 'Welcome Back',
      welcomeHint: 'Glad to see you again!',
    },
    settings: {
      account: 'Account', appearance: 'Appearance', descAccount: 'Account info, sessions and 2FA', descAppearance: 'Theme, wallpaper, blur and font size', descLanguage: 'Change app language and sync it to your account', descNotifications: 'Push alerts, banners, sounds and quiet hours', descOverview: 'A quick overview of important account settings', descPrivacy: 'Visibility, block list and security', descProfile: 'Profile page, media and public info', language: 'Language', languageDesc: 'Change app language on this device and sync it to your account.', notifications: 'Notifications', overview: 'Overview', privacy: 'Privacy', profile: 'Profile', settings: 'Settings', support: 'Support', currentLanguage: 'Current language', saveLanguageSuccess: 'App language updated.', backToChat: 'Back to chat', logout: 'Log out', helpCenter: 'Help Center', aboutApp: 'About KaijuMess', security: 'Security', fontSize: 'Font Size', pushNotifications: 'Push Notifications', soundHapticsShort: 'Sound & Haptics', light: 'Light', dark: 'Dark', system: 'System', auto: 'Auto', themeMode: 'Theme Mode', chatWallpaper: 'Chat Wallpaper', clear: 'Clear', seeAll: 'See All', notificationsHero: 'Personalize notifications', messageNotifications: 'Message Notifications', groupNotifications: 'Group Notifications', appSounds: 'App Sounds & Haptics', active: 'Active', muted: 'Muted', showPreviews: 'Show Previews', displayMessageText: 'Display message text in alerts', alertStyle: 'Alert Style', groupAlerts: 'Group Alerts', groupAlertsDesc: 'Receive alerts for new messages', muteMentions: 'Mute Mentions', muteMentionsDesc: 'Ignore @notifications in groups', inAppSounds: 'In-App Sounds', inAppVibrate: 'In-App Vibrate', soundHaptics: 'Sound & Haptics', profileBio: 'Bio', network: 'Network', sendMessage: 'Send Message', privacySecurity: 'Privacy & Security', protectedAccount: 'Protected Account', connectedAccount: 'Connected Account'
    },
    people: { friends: 'Friends', received: 'Requests', sent: 'Sent' },
    people: { friends: 'Friends', received: 'Requests', sent: 'Sent', findPeople: 'Find People', searchByNameOrEmail: 'Search by name or email', searchPlaceholder: 'Enter full name, username or email', recentFriends: 'Recent Friends', sentRequests: 'Sent Requests', receivedRequests: 'Friend Requests', searching: 'Searching users...', noMatches: 'No matching accounts found.', systemResults: 'System search results' },
    calls: { title: 'Recent Calls', loading: 'Loading call history...', empty: 'There are no calls in the current range.', loadingMore: 'Loading more calls...', summaryDefault: 'Showing the latest 15 calls. Scroll down to load more batches.', summaryFiltered: 'Showing the latest 15 calls for the current filters. Keep scrolling to load more.', incoming: 'Incoming call', outgoing: 'Outgoing call', openConversation: 'Open conversation', searchPlaceholder: 'Search by name or email', recentLabel: 'Calls', noDuration: 'No duration', incomingStatus: 'Incoming', outgoingStatus: 'Outgoing', missed: 'Missed', rejected: 'Rejected', busy: 'Busy' },
    notifications: { allActivity: 'All Activity', friendInvitations: 'Friend Invitations', groupInvitations: 'Group Invitations', mentions: 'Mentions', noMatches: 'No matching notifications.', unread: 'Unread', exit: 'Exit', markAllRead: 'Mark all as read', searchPlaceholder: 'Search notifications...', title: 'Notifications', unreadNow: 'You have {count} unread notifications right now.' },
  },
  es: {
    app: { inbox: 'Bandeja', messages: 'Mensajes', notifications: 'Notificaciones', settings: 'Ajustes', search: 'Buscar', searchMessages: 'Buscar mensajes...', people: 'Personas' },
    auth: { createAccount: 'Crear cuenta', createAccountHint: 'Crea una cuenta nueva para empezar con KaijuMess.', emailAddress: 'Correo', forgotPassword: 'Olvidaste tu contrasena?', fullName: 'Nombre completo', login: 'Iniciar sesion', loginGoogle: 'Entrar con Google', password: 'Contrasena', rememberMe: 'Recordarme', signUp: 'Registrarse', welcomeBack: 'Bienvenido de nuevo', welcomeHint: 'Que bueno verte otra vez!' },
    settings: { account: 'Cuenta', appearance: 'Apariencia', descAccount: 'Cuenta, sesiones y 2FA', descAppearance: 'Tema, fondo, desenfoque y tamano de fuente', descLanguage: 'Cambiar idioma y sincronizar con la cuenta', descNotifications: 'Alertas, banners, sonidos y modo silencioso', descOverview: 'Resumen rapido de los ajustes importantes', descPrivacy: 'Visibilidad, bloqueos y seguridad', descProfile: 'Perfil, medios e informacion publica', language: 'Idioma', languageDesc: 'Cambia el idioma de la app en este dispositivo y sincronizalo con tu cuenta.', notifications: 'Notificaciones', overview: 'Resumen', privacy: 'Privacidad', profile: 'Perfil', settings: 'Ajustes', support: 'Soporte', currentLanguage: 'Idioma actual', saveLanguageSuccess: 'Idioma actualizado.', backToChat: 'Volver al chat', logout: 'Cerrar sesion', helpCenter: 'Centro de ayuda', aboutApp: 'Acerca de KaijuMess' },
    people: { friends: 'Amigos', received: 'Solicitudes', sent: 'Enviadas', findPeople: 'Buscar personas', searchByNameOrEmail: 'Buscar por nombre o correo', searchPlaceholder: 'Ingresa nombre, usuario o correo', recentFriends: 'Amigos recientes', sentRequests: 'Solicitudes enviadas', receivedRequests: 'Solicitudes de amistad', searching: 'Buscando usuarios...', noMatches: 'No se encontraron cuentas coincidentes.', systemResults: 'Resultados del sistema' },
    calls: { title: 'Llamadas recientes', loading: 'Cargando historial de llamadas...', empty: 'No hay llamadas en el rango actual.', loadingMore: 'Cargando mas llamadas...', summaryDefault: 'Mostrando las 15 llamadas mas recientes. Desplaza para cargar mas.', summaryFiltered: 'Mostrando las 15 llamadas mas recientes segun el filtro actual. Sigue desplazando para cargar mas.', incoming: 'Llamada entrante', outgoing: 'Llamada saliente', openConversation: 'Abrir conversacion', searchPlaceholder: 'Buscar por nombre o correo', recentLabel: 'Llamadas', noDuration: 'Sin duracion', incomingStatus: 'Entrante', outgoingStatus: 'Saliente', missed: 'Perdida', rejected: 'Rechazada', busy: 'Ocupado' },
    notifications: { allActivity: 'Actividad', friendInvitations: 'Invitaciones de amistad', groupInvitations: 'Invitaciones de grupo', mentions: 'Menciones', noMatches: 'No hay notificaciones coincidentes.', unread: 'No leidas', exit: 'Salir', markAllRead: 'Marcar todo como leido', searchPlaceholder: 'Buscar notificaciones...', title: 'Notificaciones', unreadNow: 'Tienes {count} notificaciones sin leer.' },
  },
  fr: {
    app: { inbox: 'Boite', messages: 'Messages', notifications: 'Notifications', settings: 'Parametres', search: 'Recherche', searchMessages: 'Rechercher des messages...', people: 'Personnes' },
    auth: { createAccount: 'Creer un compte', createAccountHint: 'Creez un nouveau compte pour commencer avec KaijuMess.', emailAddress: 'Adresse e-mail', forgotPassword: 'Mot de passe oublie ?', fullName: 'Nom complet', login: 'Connexion', loginGoogle: 'Connexion avec Google', password: 'Mot de passe', rememberMe: 'Se souvenir de moi', signUp: 'Inscription', welcomeBack: 'Bon retour', welcomeHint: 'Heureux de vous revoir !' },
    settings: { account: 'Compte', appearance: 'Apparence', descAccount: 'Compte, sessions et 2FA', descAppearance: 'Theme, fond, flou et taille du texte', descLanguage: 'Changer la langue et la synchroniser avec le compte', descNotifications: 'Alertes, bannieres, sons et heures calmes', descOverview: 'Vue rapide des reglages importants', descPrivacy: 'Visibilite, blocage et securite', descProfile: 'Profil, medias et informations publiques', language: 'Langue', languageDesc: 'Changez la langue de l application sur cet appareil et synchronisez-la avec votre compte.', notifications: 'Notifications', overview: 'Vue d ensemble', privacy: 'Confidentialite', profile: 'Profil', settings: 'Parametres', support: 'Support', currentLanguage: 'Langue actuelle', saveLanguageSuccess: 'Langue mise a jour.', backToChat: 'Retour au chat', logout: 'Se deconnecter', helpCenter: 'Centre d aide', aboutApp: 'A propos de KaijuMess' },
    people: { friends: 'Amis', received: 'Demandes', sent: 'Envoyees', findPeople: 'Trouver des personnes', searchByNameOrEmail: 'Rechercher par nom ou email', searchPlaceholder: 'Entrez un nom complet, identifiant ou email', recentFriends: 'Amis recents', sentRequests: 'Demandes envoyees', receivedRequests: 'Demandes d amitie', searching: 'Recherche des utilisateurs...', noMatches: 'Aucun compte correspondant.', systemResults: 'Resultats systeme' },
    calls: { title: 'Appels recents', loading: 'Chargement de l historique des appels...', empty: 'Aucun appel pour la plage actuelle.', loadingMore: 'Chargement de plus d appels...', summaryDefault: 'Affichage des 15 appels les plus recents. Faites defiler pour charger la suite.', summaryFiltered: 'Affichage des 15 appels les plus recents selon le filtre actuel. Continuez a defiler pour charger plus.', incoming: 'Appel entrant', outgoing: 'Appel sortant', openConversation: 'Ouvrir la conversation', searchPlaceholder: 'Rechercher par nom ou email', recentLabel: 'Appels', noDuration: 'Aucune duree', incomingStatus: 'Entrant', outgoingStatus: 'Sortant', missed: 'Manque', rejected: 'Refuse', busy: 'Occupe' },
    notifications: { allActivity: 'Activite', friendInvitations: 'Invitations d amis', groupInvitations: 'Invitations de groupe', mentions: 'Mentions', noMatches: 'Aucune notification correspondante.', unread: 'Non lues', exit: 'Quitter', markAllRead: 'Tout marquer lu', searchPlaceholder: 'Rechercher des notifications...', title: 'Notifications', unreadNow: 'Vous avez {count} notifications non lues.' },
  },
  de: {
    app: { inbox: 'Postfach', messages: 'Nachrichten', notifications: 'Benachrichtigungen', settings: 'Einstellungen', search: 'Suche', searchMessages: 'Nachrichten suchen...', people: 'Leute' },
    auth: { createAccount: 'Konto erstellen', createAccountHint: 'Erstelle ein neues Konto fur KaijuMess.', emailAddress: 'E-Mail-Adresse', forgotPassword: 'Passwort vergessen?', fullName: 'Vollstandiger Name', login: 'Anmelden', loginGoogle: 'Mit Google anmelden', password: 'Passwort', rememberMe: 'Angemeldet bleiben', signUp: 'Registrieren', welcomeBack: 'Willkommen zuruck', welcomeHint: 'Schon dich wiederzusehen!' },
    settings: { account: 'Konto', appearance: 'Darstellung', descAccount: 'Kontodaten, Sitzungen und 2FA', descAppearance: 'Thema, Hintergrund, Blur und Schriftgrosse', descLanguage: 'App-Sprache andern und mit dem Konto synchronisieren', descNotifications: 'Pushs, Banner, Tone und Ruhezeiten', descOverview: 'Schneller Uberblick uber wichtige Einstellungen', descPrivacy: 'Sichtbarkeit, Sperrliste und Sicherheit', descProfile: 'Profil, Medien und offentliche Infos', language: 'Sprache', languageDesc: 'Andere die App-Sprache auf diesem Gerat und synchronisiere sie mit deinem Konto.', notifications: 'Benachrichtigungen', overview: 'Uberblick', privacy: 'Datenschutz', profile: 'Profil', settings: 'Einstellungen', support: 'Support', currentLanguage: 'Aktuelle Sprache', saveLanguageSuccess: 'Sprache aktualisiert.', backToChat: 'Zuruck zum Chat', logout: 'Abmelden', helpCenter: 'Hilfezentrum', aboutApp: 'Uber KaijuMess' },
    people: { friends: 'Freunde', received: 'Anfragen', sent: 'Gesendet', findPeople: 'Personen finden', searchByNameOrEmail: 'Nach Name oder E-Mail suchen', searchPlaceholder: 'Vollstandigen Namen, Benutzernamen oder E-Mail eingeben', recentFriends: 'Letzte Freunde', sentRequests: 'Gesendete Anfragen', receivedRequests: 'Freundschaftsanfragen', searching: 'Benutzer werden gesucht...', noMatches: 'Keine passenden Konten gefunden.', systemResults: 'Systemsuchergebnisse' },
    calls: { title: 'Letzte Anrufe', loading: 'Anrufverlauf wird geladen...', empty: 'Keine Anrufe im aktuellen Bereich.', loadingMore: 'Weitere Anrufe werden geladen...', summaryDefault: 'Die letzten 15 Anrufe werden angezeigt. Scrolle fur weitere Eintrage.', summaryFiltered: 'Die letzten 15 Anrufe fur die aktuellen Filter werden angezeigt. Scrolle weiter fur mehr.', incoming: 'Eingehender Anruf', outgoing: 'Ausgehender Anruf', openConversation: 'Konversation offnen', searchPlaceholder: 'Nach Name oder E-Mail suchen', recentLabel: 'Anrufe', noDuration: 'Keine Dauer', incomingStatus: 'Eingehend', outgoingStatus: 'Ausgehend', missed: 'Verpasst', rejected: 'Abgelehnt', busy: 'Besetzt' },
    notifications: { allActivity: 'Alle Aktivitaten', friendInvitations: 'Freundschaftsanfragen', groupInvitations: 'Gruppeneinladungen', mentions: 'Erwahnungen', noMatches: 'Keine passenden Benachrichtigungen.', unread: 'Ungelesen', exit: 'Schliessen', markAllRead: 'Alle als gelesen', searchPlaceholder: 'Benachrichtigungen suchen...', title: 'Benachrichtigungen', unreadNow: 'Du hast {count} ungelesene Benachrichtigungen.' },
  },
  ja: {
    app: { inbox: '受信箱', messages: 'メッセージ', notifications: '通知', settings: '設定', search: '検索', searchMessages: 'メッセージを検索...', people: 'People' },
    auth: { createAccount: 'アカウント作成', createAccountHint: 'KaijuMess を始めるための新しいアカウントを作成します。', emailAddress: 'メールアドレス', forgotPassword: 'パスワードを忘れた?', fullName: '氏名', login: 'ログイン', loginGoogle: 'Googleでログイン', password: 'パスワード', rememberMe: 'ログイン状態を保持', signUp: '登録', welcomeBack: 'おかえりなさい', welcomeHint: 'また会えてうれしいです。' },
    settings: { account: 'アカウント', appearance: '表示', descAccount: 'アカウント情報、セッション、2FA', descAppearance: 'テーマ、壁紙、ぼかし、文字サイズ', descLanguage: 'アプリ言語を変更してアカウントに同期します', descNotifications: '通知、バナー、サウンド、静音時間', descOverview: '重要な設定の概要', descPrivacy: '公開範囲、ブロック、セキュリティ', descProfile: 'プロフィール、メディア、公開情報', language: '言語', languageDesc: 'この端末のアプリ言語を変更し、アカウントにも同期します。', notifications: '通知', overview: '概要', privacy: 'プライバシー', profile: 'プロフィール', settings: '設定', support: 'サポート', currentLanguage: '現在の言語', saveLanguageSuccess: '言語を更新しました。', backToChat: 'チャットに戻る', logout: 'ログアウト', helpCenter: 'ヘルプセンター', aboutApp: 'KaijuMessについて' },
    people: { friends: '友達', received: 'リクエスト', sent: '送信済み', findPeople: '人を探す', searchByNameOrEmail: '名前またはメールで検索', searchPlaceholder: '氏名、ユーザー名、メールを入力', recentFriends: '最近の友達', sentRequests: '送信済みリクエスト', receivedRequests: '友達申請', searching: 'ユーザーを検索中...', noMatches: '一致するアカウントがありません。', systemResults: 'システム検索結果' },
    calls: { title: '最近の通話', loading: '通話履歴を読み込み中...', empty: '現在の条件に一致する通話はありません。', loadingMore: 'さらに通話を読み込み中...', summaryDefault: '直近15件の通話を表示しています。下へスクロールして続きを読み込みます。', summaryFiltered: '現在のフィルタで直近15件の通話を表示しています。さらにスクロールして追加読み込みします。', incoming: '着信', outgoing: '発信', openConversation: '会話を開く', searchPlaceholder: '名前またはメールで検索', recentLabel: '通話', noDuration: '通話時間なし', incomingStatus: '着信', outgoingStatus: '発信', missed: '不在着信', rejected: '拒否', busy: '通話中' },
    notifications: { allActivity: 'すべて', friendInvitations: '友達招待', groupInvitations: 'グループ招待', mentions: 'メンション', noMatches: '該当する通知がありません。', unread: '未読', exit: '閉じる', markAllRead: 'すべて既読', searchPlaceholder: '通知を検索...', title: '通知', unreadNow: '未読通知が {count} 件あります。' },
  },
};

const getValueByPath = (object, path) => path.split('.').reduce((acc, key) => acc?.[key], object);

export const LanguageProvider = ({ children }) => {
  const { currentUser, updateCurrentUserPreferences } = useAuth();
  const [language, setLanguageState] = useState('vi');

  useEffect(() => {
    const nextLanguage = currentUser?.preferences?.localization?.language || 'vi';
    setLanguageState(languageOptions.some((item) => item.code === nextLanguage) ? nextLanguage : 'vi');
  }, [currentUser?.preferences?.localization?.language]);

  const setLanguage = async (nextLanguage) => {
    if (!languageOptions.some((item) => item.code === nextLanguage)) {
      return;
    }

    setLanguageState(nextLanguage);

    if (currentUser?.id) {
      try {
        const payload = await updateSettingsSection('localization', { language: nextLanguage });
        updateCurrentUserPreferences('localization', payload.preferences?.localization || { language: nextLanguage });
      } catch {
        // Keep optimistic UI if sync is temporarily unavailable.
      }
    }
  };

  const value = useMemo(() => {
    const dictionary = dictionaries[language] || dictionaries.vi;

    return {
      language,
      languageOptions,
      setLanguage,
      t: (path, replacements = {}) => {
        const template = getValueByPath(dictionary, path) || getValueByPath(dictionaries.vi, path) || path;
        return Object.entries(replacements).reduce(
          (currentValue, [key, replacement]) => currentValue.replace(`{${key}}`, String(replacement)),
          template,
        );
      },
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
};
