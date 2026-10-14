/* Calendrier de service — calculs effectués sur des jours UTC entiers. */
(() => {
  'use strict';

  const STORAGE_KEY = 'mon-rythme-parametres-v1';
  const PREGNANCY_KEY = 'mon-rythme-grossesse-v1';
  const NOTIFIED_KEY = 'mon-rythme-rappels-envoyes-v1';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const DEFAULTS = { referenceDate: '2026-10-14', serviceDays: 7, restDays: 7 };
  const weekdayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const longDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const shortDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const monthDate = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const elements = {
    statusCard: document.querySelector('.status-card'),
    statusIcon: document.querySelector('#status-icon'),
    statusKicker: document.querySelector('#status-kicker'),
    statusHeading: document.querySelector('#status-heading'),
    statusDetail: document.querySelector('#status-detail'),
    daysRemaining: document.querySelector('#days-remaining'),
    daysLabel: document.querySelector('#days-label'),
    monthLabel: document.querySelector('#month-label'),
    calendarGrid: document.querySelector('#calendar-grid'),
    upcomingList: document.querySelector('#upcoming-list'),
    referenceDate: document.querySelector('#reference-date'),
    serviceDays: document.querySelector('#service-days'),
    restDays: document.querySelector('#rest-days'),
    settingsForm: document.querySelector('#settings-form'),
    settingsFeedback: document.querySelector('#settings-feedback'),
    searchForm: document.querySelector('#date-search-form'),
    searchDate: document.querySelector('#search-date'),
    searchResult: document.querySelector('#search-result'),
    pregnancyForm: document.querySelector('#pregnancy-form'),
    pregnancyStart: document.querySelector('#pregnancy-start'),
    whatsappNumber: document.querySelector('#whatsapp-number'),
    pregnancyStage: document.querySelector('#pregnancy-stage'),
    wellbeingNote: document.querySelector('#wellbeing-note'),
    notificationFeedback: document.querySelector('#notification-feedback'),
  };

  let settings = readSettings();
  let today = getTodayOrdinal();
  let todayParts = ordinalToParts(today);
  const pregnancySettings = readPregnancySettings();
  let displayedYear = todayParts.year;
  let displayedMonth = todayParts.month;
  let searchOrdinal = null;
  let installPromptEvent = null;
  const installButton = document.querySelector('#install-app');

  // Une date ISO est convertie en ordinal UTC afin d'ignorer les fuseaux horaires.
  function dateToOrdinal(isoDate) {
    const parts = isoDate.split('-').map(Number);
    return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / DAY_MS);
  }

  function ordinalToParts(ordinal) {
    const date = new Date(ordinal * DAY_MS);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
  }

  function ordinalToISO(ordinal) {
    const date = new Date(ordinal * DAY_MS);
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  function getTodayOrdinal() {
    const now = new Date();
    return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
  }

  function addDays(ordinal, count) {
    return ordinal + count;
  }

  function addMonths(ordinal, count) {
    const parts = ordinalToParts(ordinal);
    return Math.floor(Date.UTC(parts.year, parts.month + count, parts.day) / DAY_MS);
  }

  function positiveModulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function cycleLength() {
    return settings.serviceDays + settings.restDays;
  }

  // Le modulo positif permet aussi de calculer correctement les dates antérieures à la référence.
  function phaseOn(ordinal) {
    return positiveModulo(ordinal - dateToOrdinal(settings.referenceDate), cycleLength());
  }

  function isDutyDay(ordinal) {
    return phaseOn(ordinal) < settings.serviceDays;
  }

  function readSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && isValidSettings(stored)) return stored;
    } catch (error) {
      // Des paramètres illisibles ne bloquent pas l'ouverture du calendrier.
    }
    return { ...DEFAULTS };
  }

  function isValidSettings(value) {
    return (
      typeof value.referenceDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.referenceDate) &&
      Number.isInteger(value.serviceDays) &&
      value.serviceDays >= 1 &&
      value.serviceDays <= 365 &&
      Number.isInteger(value.restDays) &&
      value.restDays >= 1 &&
      value.restDays <= 365
    );
  }

  function readPregnancySettings() {
    // Le numéro n'est pas inscrit dans les fichiers publics : il reste propre à l'appareil.
    const fallback = { startDate: ordinalToISO(addMonths(today, -1)), phone: '' };
    try {
      const stored = JSON.parse(localStorage.getItem(PREGNANCY_KEY) || 'null');
      if (
        stored &&
        /^\d{4}-\d{2}-\d{2}$/.test(stored.startDate || '') &&
        ordinalToISO(dateToOrdinal(stored.startDate)) === stored.startDate &&
        dateToOrdinal(stored.startDate) <= today
      ) {
        return {
          startDate: stored.startDate,
          phone: typeof stored.phone === 'string' ? stored.phone : '',
        };
      }
    } catch (error) {
      // Les préférences grossesse sont facultatives; les réglages par défaut restent utilisables.
    }
    return fallback;
  }

  function formatDate(ordinal, formatter = shortDate) {
    return formatter.format(new Date(ordinal * DAY_MS));
  }

  function renderStatus() {
    const duty = isDutyDay(today);
    const offset = phaseOn(today);
    const daysUntilChange = duty ? settings.serviceDays - offset : cycleLength() - offset;
    const changeDay = addDays(today, daysUntilChange);
    const lastDay = changeDay - 1;

    elements.statusCard.classList.toggle('is-duty', duty);
    elements.statusIcon.textContent = duty ? '✦' : '⌂';
    elements.statusKicker.textContent = duty ? 'EN CE MOMENT' : 'EN CE MOMENT';
    elements.statusHeading.textContent = duty ? 'En service' : 'À la maison';
    elements.statusDetail.textContent = `Jusqu’au ${formatDate(lastDay)}`;
    elements.daysRemaining.textContent = String(daysUntilChange);
    elements.daysLabel.textContent =
      daysUntilChange === 1 ? 'jour avant le changement' : 'jours avant le changement';
  }

  function renderCalendar() {
    const firstOfMonth = Math.floor(Date.UTC(displayedYear, displayedMonth, 1) / DAY_MS);
    const mondayOffset = (new Date(firstOfMonth * DAY_MS).getUTCDay() + 6) % 7;
    const gridStart = firstOfMonth - mondayOffset;
    elements.monthLabel.textContent = monthDate.format(new Date(firstOfMonth * DAY_MS));
    elements.calendarGrid.replaceChildren();

    weekdayNames.forEach((name) => {
      const heading = document.createElement('div');
      heading.className = 'weekday';
      heading.setAttribute('role', 'columnheader');
      heading.textContent = name;
      elements.calendarGrid.append(heading);
    });

    for (let index = 0; index < 42; index += 1) {
      const ordinal = gridStart + index;
      const parts = ordinalToParts(ordinal);
      const duty = isDutyDay(ordinal);
      const cell = document.createElement('div');
      cell.className = `day-cell ${duty ? 'is-duty' : 'is-home'}`;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute(
        'aria-label',
        `${formatDate(ordinal, longDate)}, ${duty ? 'en service' : 'à la maison'}`
      );
      if (parts.month !== displayedMonth) cell.classList.add('is-outside');
      if (ordinal === today) {
        cell.classList.add('is-today');
        cell.setAttribute('aria-current', 'date');
      }
      if (ordinal === searchOrdinal) cell.classList.add('is-searched');
      const number = document.createElement('span');
      number.className = 'day-number';
      number.textContent = String(parts.day);
      cell.append(number);
      elements.calendarGrid.append(cell);
    }
  }

  function renderUpcoming() {
    elements.upcomingList.replaceChildren();
    const length = cycleLength();
    let found = 0;
    let candidate = today;
    // Il y a deux relèves par cycle : la date courante peut elle-même en être une.
    while (found < 12 && candidate <= today + length * 13) {
      const phase = phaseOn(candidate);
      if (phase === 0 || phase === settings.serviceDays) {
        const isStartOfService = phase === 0;
        const item = document.createElement('li');
        item.className = 'upcoming-item';
        const marker = document.createElement('span');
        marker.className = `upcoming-marker ${isStartOfService ? 'is-duty' : 'is-home'}`;
        marker.setAttribute('aria-hidden', 'true');
        marker.textContent = isStartOfService ? '↗' : '⌂';
        const copy = document.createElement('span');
        const date = document.createElement('span');
        date.className = 'upcoming-date';
        date.textContent = formatDate(candidate);
        const label = document.createElement('span');
        label.className = 'upcoming-label';
        label.textContent = isStartOfService ? 'Départ en service' : 'Retour à la maison';
        copy.append(date, label);
        item.append(marker, copy);
        elements.upcomingList.append(item);
        found += 1;
      }
      candidate += 1;
    }
  }

  const pregnancyTips = [
    [
      'Choisir des aliments variés, bien lavés et bien cuits; privilégier les produits laitiers pasteurisés.',
      'Se reposer dès que nécessaire et adopter une position confortable; le sommeil sur le côté est conseillé plus tard dans la grossesse.',
      'Garder les activités quotidiennes légères si elles sont bien tolérées; éviter les charges lourdes et les produits toxiques.',
    ],
    [
      'Fractionner les repas si les nausées gênent et boire régulièrement; demander conseil pour les vitamines prénatales.',
      'Préserver des horaires réguliers et faire une courte pause si la fatigue apparaît.',
      'Marche douce ou tâches légères si le professionnel de santé n’a pas indiqué de restriction.',
    ],
    [
      'Varier légumes, fruits, céréales et protéines bien cuites; éviter alcool, aliments crus à risque et produits non pasteurisés.',
      'Une routine calme et une chambre confortable peuvent aider au repos.',
      'Alterner les positions et faire des pauses; parler au soignant en cas de fatigue importante.',
    ],
    [
      'Privilégier une alimentation équilibrée et de l’eau; demander à la sage-femme les aliments à éviter selon votre situation.',
      'Trouver une position confortable et ménager des temps de repos.',
      'Activité modérée adaptée, uniquement si la grossesse le permet et sans douleur.',
    ],
    [
      'Ajouter des aliments riches en fibres et boire suffisamment si cela convient à votre suivi.',
      'Un coussin de soutien peut améliorer le confort; sur le côté lorsque le ventre devient plus volumineux.',
      'Éviter les efforts avec risque de chute, les fortes chaleurs et les charges lourdes.',
    ],
    [
      'Continuer les aliments variés, sûrs et bien cuits; suivre les recommandations nutritionnelles de votre soignant.',
      'Se coucher sur le côté si c’est confortable; changer de côté est possible.',
      'Prévoir des pauses et limiter les périodes debout prolongées si elles fatiguent.',
    ],
    [
      'Petits repas réguliers et hydratation; demander conseil en cas de brûlures ou d’inconfort.',
      'Dormir sur le côté avec des coussins si besoin; privilégier le confort.',
      'Réduire le rythme et les tâches pénibles; adapter le travail avec le professionnel de santé.',
    ],
    [
      'Choisir des repas simples et équilibrés; suivre les conseils personnalisés du suivi prénatal.',
      'À partir d’environ 28 semaines, dormir sur le côté est recommandé; reprendre cette position si l’on se réveille sur le dos.',
      'Éviter de porter lourd et demander de l’aide pour les tâches exigeantes.',
    ],
    [
      'Boire régulièrement et préférer des repas nourrissants et bien cuits selon l’appétit.',
      'Repos sur le côté et pauses fréquentes; le confort reste important.',
      'Alléger les tâches et suivre les consignes de la maternité ou du médecin.',
    ],
  ];

  function pregnancyMonthNumber() {
    const startOrdinal = dateToOrdinal(pregnancySettings.startDate);
    const start = ordinalToParts(startOrdinal);
    const current = ordinalToParts(today);
    let completedMonths = (current.year - start.year) * 12 + current.month - start.month;
    if (today < monthAnniversary(startOrdinal, completedMonths)) completedMonths -= 1;
    return Math.min(9, Math.max(1, completedMonths));
  }

  function renderPregnancy() {
    const elapsed = Math.max(0, today - dateToOrdinal(pregnancySettings.startDate));
    const weeks = Math.floor(elapsed / 7);
    const month = pregnancyMonthNumber();
    const tips = pregnancyTips[month - 1];
    elements.pregnancyStart.value = pregnancySettings.startDate;
    elements.whatsappNumber.value = pregnancySettings.phone;
    elements.pregnancyStage.textContent = `Repère estimatif : mois ${month} · environ ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    const labels = [
      { icon: '🥗', title: 'Nourriture' },
      { icon: '🌙', title: 'Sommeil' },
      { icon: '🧺', title: 'Activités / travail' },
    ];
    elements.wellbeingNote.replaceChildren();
    tips.forEach((tip, index) => {
      const row = document.createElement('div');
      row.className = 'wellbeing-tip';
      const sticker = document.createElement('span');
      sticker.className = 'tip-sticker';
      sticker.setAttribute('aria-hidden', 'true');
      sticker.textContent = labels[index].icon;
      const text = document.createElement('span');
      text.textContent = `${labels[index].title} : ${tip}`;
      row.append(sticker, text);
      elements.wellbeingNote.append(row);
    });
  }

  function savePregnancyPreferences() {
    const startDate = elements.pregnancyStart.value;
    const phone = elements.whatsappNumber.value.trim();
    if (!startDate || dateToOrdinal(startDate) > today) {
      elements.notificationFeedback.textContent =
        'La date de début estimée ne peut pas être dans le futur.';
      elements.notificationFeedback.classList.add('is-error');
      return false;
    }
    pregnancySettings.startDate = startDate;
    pregnancySettings.phone = phone;
    try {
      localStorage.setItem(PREGNANCY_KEY, JSON.stringify(pregnancySettings));
    } catch (error) {
      // La page continue à fonctionner même si le navigateur bloque le stockage local.
    }
    elements.notificationFeedback.classList.remove('is-error');
    renderPregnancy();
    return true;
  }

  function whatsappMessage() {
    const month = pregnancyMonthNumber();
    const tips = pregnancyTips[month - 1];
    return `🤰🏽💛 Petit message douceur — grossesse, mois ${month} 🌷\n\n🥗 Nourriture : ${tips[0]}\n🌙 Sommeil : ${tips[1]}\n🧺 Activités : ${tips[2]}\n\n✨ Ces repères sont généraux. Pour toute question, suivons l’avis de la sage-femme ou du médecin.`;
  }

  function isRemindersEnabled() {
    try {
      return localStorage.getItem('mon-rythme-notifications-activees') === 'true';
    } catch (error) {
      return false;
    }
  }

  function getSentReminderKeys() {
    try {
      return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  function saveSentReminder(key) {
    const sent = getSentReminderKeys();
    if (sent.includes(key)) return false;
    sent.push(key);
    try {
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(sent.slice(-60)));
    } catch (error) {
      /* La notification est tout de même affichée pour cette ouverture. */
    }
    return true;
  }

  function notifyIfDue(key, title, body) {
    if (!saveSentReminder(key)) return;
    elements.notificationFeedback.textContent = `${title} ${body}`;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  function monthAnniversary(startOrdinal, monthOffset) {
    const start = ordinalToParts(startOrdinal);
    const targetMonth = start.month + monthOffset;
    const targetYear = start.year + Math.floor(targetMonth / 12);
    const normalizedMonth = positiveModulo(targetMonth, 12);
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    return Math.floor(Date.UTC(targetYear, normalizedMonth, Math.min(start.day, lastDay)) / DAY_MS);
  }

  function checkDueReminders() {
    if (
      !isRemindersEnabled() ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    )
      return;
    const yesterdayPhase = phaseOn(today - 1);
    if (yesterdayPhase === 0 || yesterdayPhase === settings.serviceDays) {
      const start = yesterdayPhase === 0;
      notifyIfDue(
        `releve-${ordinalToISO(today)}`,
        start ? '🌤️ Petit rappel de relève' : '🏡 Petit rappel de relève',
        start ? 'Hier, le départ en service a commencé.' : 'Hier, le retour à la maison a commencé.'
      );
    }
    const startOrdinal = dateToOrdinal(pregnancySettings.startDate);
    const monthNumber = pregnancyMonthNumber();
    if (
      monthNumber > 1 &&
      monthNumber <= 9 &&
      monthAnniversary(startOrdinal, monthNumber - 1) === today
    ) {
      notifyIfDue(
        `grossesse-mois-${monthNumber}-${ordinalToISO(today)}`,
        '🤰🏽 Nouveau repère grossesse',
        `Le mois ${monthNumber} commence. Ouvrez Mon rythme pour voir les repères et préparer un message WhatsApp.`
      );
    }
  }

  function render() {
    renderStatus();
    renderCalendar();
    renderUpcoming();
    renderPregnancy();
  }

  function fillSettingsForm() {
    elements.referenceDate.value = settings.referenceDate;
    elements.serviceDays.value = String(settings.serviceDays);
    elements.restDays.value = String(settings.restDays);
  }

  document.querySelector('#previous-month').addEventListener('click', () => {
    if (displayedMonth === 0) {
      displayedMonth = 11;
      displayedYear -= 1;
    } else displayedMonth -= 1;
    renderCalendar();
  });

  document.querySelector('#next-month').addEventListener('click', () => {
    if (displayedMonth === 11) {
      displayedMonth = 0;
      displayedYear += 1;
    } else displayedMonth += 1;
    renderCalendar();
  });

  document.querySelector('#today-button').addEventListener('click', () => {
    displayedYear = todayParts.year;
    displayedMonth = todayParts.month;
    searchOrdinal = null;
    renderCalendar();
  });

  elements.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!elements.searchDate.value) return;
    searchOrdinal = dateToOrdinal(elements.searchDate.value);
    const parts = ordinalToParts(searchOrdinal);
    displayedYear = parts.year;
    displayedMonth = parts.month;
    const duty = isDutyDay(searchOrdinal);
    const daysUntilChange = duty
      ? settings.serviceDays - phaseOn(searchOrdinal)
      : cycleLength() - phaseOn(searchOrdinal);
    const changeDate = formatDate(searchOrdinal + daysUntilChange);
    elements.searchResult.textContent = `Le ${formatDate(searchOrdinal, longDate)} : ${duty ? 'en service' : 'à la maison'} (changement le ${changeDate}).`;
    elements.searchResult.classList.add('has-result');
    renderCalendar();
  });

  elements.pregnancyForm.addEventListener('change', savePregnancyPreferences);

  document.querySelector('#whatsapp-share').addEventListener('click', () => {
    if (!savePregnancyPreferences()) return;
    const enteredNumber = elements.whatsappNumber.value.trim();
    const hasInternationalPrefix = enteredNumber.startsWith('+') || enteredNumber.startsWith('00');
    const digits = enteredNumber.replace(/\D/g, '').replace(/^00/, '');
    if (enteredNumber && (!hasInternationalPrefix || digits.length < 8 || digits.length > 15)) {
      elements.notificationFeedback.textContent =
        'Ajoutez le préfixe international (par exemple +225, +221 ou +33) pour ouvrir directement ce contact WhatsApp.';
      elements.notificationFeedback.classList.add('is-error');
      return;
    }
    const destination = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
    const url = `${destination}?text=${encodeURIComponent(whatsappMessage())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    elements.notificationFeedback.classList.remove('is-error');
    elements.notificationFeedback.textContent =
      'WhatsApp est ouvert avec un message à vérifier et à envoyer manuellement.';
  });

  document.querySelector('#enable-notifications').addEventListener('click', async () => {
    if (!('Notification' in window)) {
      elements.notificationFeedback.textContent =
        'Les notifications ne sont pas prises en charge par ce navigateur.';
      elements.notificationFeedback.classList.add('is-error');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      elements.notificationFeedback.textContent =
        'Autorisation refusée. Les notifications nécessitent votre accord dans le navigateur.';
      elements.notificationFeedback.classList.add('is-error');
      return;
    }
    try {
      localStorage.setItem('mon-rythme-notifications-activees', 'true');
    } catch (error) {
      /* Les notifications du navigateur restent disponibles pour cette session. */
    }
    elements.notificationFeedback.classList.remove('is-error');
    elements.notificationFeedback.textContent =
      'Rappels activés. Pour les recevoir, gardez cette page ouverte le jour du rappel.';
    checkDueReminders();
  });

  elements.settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    elements.settingsFeedback.classList.remove('is-error');
    const proposed = {
      referenceDate: elements.referenceDate.value,
      serviceDays: Number(elements.serviceDays.value),
      restDays: Number(elements.restDays.value),
    };
    if (!elements.settingsForm.reportValidity()) return;
    if (!isValidSettings(proposed)) {
      elements.settingsFeedback.textContent =
        'Vérifiez la date et saisissez une durée entre 1 et 365 jours.';
      elements.settingsFeedback.classList.add('is-error');
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proposed));
      settings = proposed;
      render();
      elements.settingsFeedback.textContent = 'Paramètres enregistrés sur cet appareil.';
    } catch (error) {
      elements.settingsFeedback.textContent =
        'Impossible d’enregistrer les paramètres dans ce navigateur.';
      elements.settingsFeedback.classList.add('is-error');
    }
  });

  function icsEscape(value) {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  function makeIcsDate(ordinal) {
    return ordinalToISO(ordinal).replace(/-/g, '');
  }

  function createCalendarEvents() {
    const rangeStart = today;
    const rangeEnd = addMonths(today, 12);
    const events = [];
    let blockStart = rangeStart;
    let blockDuty = isDutyDay(rangeStart);

    // Les événements sont des journées entières, avec une fin exclusive comme le prévoit iCalendar.
    for (let day = rangeStart + 1; day <= rangeEnd; day += 1) {
      const duty = day < rangeEnd ? isDutyDay(day) : !blockDuty;
      if (day === rangeEnd || duty !== blockDuty) {
        events.push({ start: blockStart, end: day, duty: blockDuty });
        blockStart = day;
        blockDuty = duty;
      }
    }
    return events;
  }

  function exportIcs() {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
    const events = createCalendarEvents().map((item, index) =>
      [
        'BEGIN:VEVENT',
        `UID:mon-rythme-${stamp}-${index}@calendrier-local`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${makeIcsDate(item.start)}`,
        `DTEND;VALUE=DATE:${makeIcsDate(item.end)}`,
        `SUMMARY:${icsEscape(item.duty ? 'En service' : 'À la maison')}`,
        `DESCRIPTION:${icsEscape(item.duty ? 'Période de service' : 'Période à la maison')}`,
        'END:VEVENT',
      ].join('\r\n')
    );
    const content =
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Mon Rythme//Calendrier de service//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        ...events,
        'END:VCALENDAR',
      ].join('\r\n') + '\r\n';
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calendrier-de-service.ics';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  document.querySelector('#export-ics').addEventListener('click', exportIcs);
  document.querySelector('#print-calendar').addEventListener('click', () => window.print());

  const isAppleMobile =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isAppleMobile;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isMobileBrowser && !isStandalone) installButton.hidden = false;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPromptEvent = event;
    installButton.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === 'accepted') installButton.hidden = true;
      installPromptEvent = null;
      return;
    }
    const instructions = isAppleMobile
      ? 'Dans Safari, touchez Partager, puis « Sur l’écran d’accueil » et Ajouter.'
      : 'Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ». Cette page doit être ouverte depuis son adresse HTTPS.';
    window.alert(instructions);
  });

  window.addEventListener('appinstalled', () => {
    installButton.hidden = true;
    installPromptEvent = null;
  });

  // Les service workers nécessitent HTTPS (ou localhost); l’ouverture locale par double-clic reste compatible.
  if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // L’application reste utilisable en ligne même si le navigateur refuse la mise en cache hors ligne.
    });
  }

  document.querySelector('#footer-year').textContent = `© ${todayParts.year}`;
  fillSettingsForm();
  render();
  checkDueReminders();
  // Si la page reste ouverte, détecter le passage au jour suivant sans rechargement.
  window.setInterval(() => {
    const currentDay = getTodayOrdinal();
    if (currentDay !== today) {
      today = currentDay;
      todayParts = ordinalToParts(today);
      render();
      checkDueReminders();
    }
  }, 60_000);
})();
