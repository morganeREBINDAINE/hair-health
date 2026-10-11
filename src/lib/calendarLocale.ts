import { LocaleConfig } from 'react-native-calendars';
import { DAY_SHORT, MONTHS } from './dates';

// Locale française partagée par tous les calendriers (react-native-calendars).
LocaleConfig.locales['fr'] = {
  monthNames: MONTHS,
  monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: DAY_SHORT,
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = 'fr';
