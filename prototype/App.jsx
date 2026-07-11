import { useState, useEffect } from "react";

const SEED_RECORDS = [
  { id:"r1",  year:2003, month:9,  hours:1,   note:"Начало служения" },
  { id:"r2",  year:2003, month:10, hours:24,  note:"" },
  { id:"r3",  year:2003, month:11, hours:14,  note:"" },
  { id:"r4",  year:2003, month:12, hours:14,  note:"" },
  { id:"r5",  year:2004, month:1,  hours:25,  note:"" },
  { id:"r6",  year:2004, month:2,  hours:52,  note:"Подсобный пионер" },
  { id:"r7",  year:2004, month:3,  hours:73,  note:"Подсобный пионер" },
  { id:"r8",  year:2004, month:4,  hours:69,  note:"Подсобный пионер" },
  { id:"r9",  year:2004, month:5,  hours:72,  note:"Начало общего пионерского" },
  { id:"r10", year:2004, month:6,  hours:74,  note:"Пионер" },
  { id:"r11", year:2004, month:7,  hours:68,  note:"Пионер" },
  { id:"r12", year:2004, month:8,  hours:48,  note:"Пионер" },
  { id:"r13", year:2004, month:9,  hours:77,  note:"Пионер" },
  { id:"r14", year:2004, month:10, hours:66,  note:"Пионер" },
  { id:"r15", year:2004, month:11, hours:38,  note:"Смещён" },
  { id:"r16", year:2004, month:12, hours:19,  note:"" },
  { id:"r17", year:2005, month:1,  hours:18,  note:"" },
  { id:"r18", year:2005, month:2,  hours:12,  note:"Свадьба 25.02.2005" },
  { id:"r19", year:2005, month:3,  hours:11,  note:"" },
  { id:"r20", year:2005, month:4,  hours:11,  note:"" },
  { id:"r21", year:2005, month:5,  hours:23,  note:"" },
  { id:"r22", year:2005, month:9,  hours:19,  note:"" },
  { id:"r23", year:2005, month:10, hours:15,  note:"" },
  { id:"r24", year:2005, month:11, hours:16,  note:"" },
  { id:"r25", year:2005, month:12, hours:19,  note:"" },
  { id:"r26", year:2006, month:1,  hours:6,   note:"" },
  { id:"r27", year:2006, month:2,  hours:14,  note:"" },
  { id:"r28", year:2006, month:3,  hours:14,  note:"" },
  { id:"r29", year:2006, month:4,  hours:15,  note:"" },
  { id:"r30", year:2006, month:5,  hours:12,  note:"" },
  { id:"r31", year:2006, month:6,  hours:10,  note:"" },
  { id:"r32", year:2006, month:7,  hours:15,  note:"" },
  { id:"r33", year:2006, month:8,  hours:14,  note:"" },
  { id:"r34", year:2007, month:8,  hours:54,  note:"Подсобный пионер — Каневская" },
  { id:"r35", year:2007, month:9,  hours:52,  note:"Подсобный пионер" },
  { id:"r36", year:2007, month:10, hours:51,  note:"Подсобный пионер" },
  { id:"r37", year:2007, month:11, hours:53,  note:"Подсобный пионер" },
  { id:"r38", year:2007, month:12, hours:61,  note:"Подсобный пионер" },
  { id:"r39", year:2008, month:1,  hours:51,  note:"Подсобный пионер" },
  { id:"r40", year:2008, month:2,  hours:76,  note:"Подсобный пионер" },
  { id:"r41", year:2008, month:3,  hours:75,  note:"Начало регулярного пионерского" },
  { id:"r42", year:2008, month:4,  hours:71,  note:"Пионер" },
  { id:"r43", year:2008, month:5,  hours:72,  note:"Пионер" },
  { id:"r44", year:2008, month:6,  hours:70,  note:"Пионер" },
  { id:"r45", year:2008, month:7,  hours:72,  note:"Пионер" },
  { id:"r46", year:2008, month:8,  hours:54,  note:"Пионер" },
  { id:"r47", year:2008, month:9,  hours:65,  note:"Пионер" },
  { id:"r48", year:2008, month:10, hours:70,  note:"Пионер" },
  { id:"r49", year:2008, month:11, hours:25,  note:"Кредит 48ч" },
  { id:"r50", year:2008, month:12, hours:32,  note:"Кредит 42ч" },
  { id:"r51", year:2009, month:1,  hours:60,  note:"Кредит 16ч" },
  { id:"r52", year:2009, month:2,  hours:73,  note:"Пионер" },
  { id:"r53", year:2009, month:3,  hours:80,  note:"Пионер" },
  { id:"r54", year:2009, month:4,  hours:92,  note:"Пионер" },
  { id:"r55", year:2009, month:5,  hours:104, note:"Пионер" },
  { id:"r56", year:2009, month:6,  hours:98,  note:"Пионер" },
  { id:"r57", year:2009, month:7,  hours:33,  note:"Переезд в Саранск" },
  { id:"r58", year:2009, month:8,  hours:31,  note:"Школа пионеров Саранск +40ч" },
  { id:"r59", year:2009, month:9,  hours:77,  note:"" },
  { id:"r60", year:2009, month:10, hours:84,  note:"" },
  { id:"r61", year:2009, month:11, hours:71,  note:"" },
  { id:"r62", year:2009, month:12, hours:68,  note:"" },
  { id:"r63", year:2010, month:1,  hours:46,  note:"Переезд в Новоминскую" },
  { id:"r64", year:2010, month:2,  hours:50,  note:"" },
  { id:"r65", year:2010, month:3,  hours:76,  note:"" },
  { id:"r66", year:2010, month:4,  hours:40,  note:"Болел 20 дней" },
  { id:"r67", year:2010, month:5,  hours:67,  note:"" },
  { id:"r68", year:2010, month:6,  hours:108, note:"" },
  { id:"r69", year:2010, month:7,  hours:85,  note:"" },
  { id:"r70", year:2010, month:8,  hours:68,  note:"" },
  { id:"r71", year:2010, month:9,  hours:71,  note:"" },
  { id:"r72", year:2010, month:10, hours:75,  note:"" },
  { id:"r73", year:2010, month:11, hours:87,  note:"" },
  { id:"r74", year:2010, month:12, hours:69,  note:"" },
  { id:"r75", year:2011, month:1,  hours:75,  note:"3 года пионерского" },
  { id:"r76", year:2011, month:2,  hours:69,  note:"" },
  { id:"r77", year:2011, month:3,  hours:63,  note:"Болел 4 дня" },
  { id:"r78", year:2011, month:4,  hours:54,  note:"" },
  { id:"r79", year:2011, month:5,  hours:73,  note:"" },
  { id:"r80", year:2011, month:6,  hours:74,  note:"" },
  { id:"r81", year:2011, month:7,  hours:77,  note:"" },
  { id:"r82", year:2011, month:8,  hours:34,  note:"" },
  { id:"r83", year:2011, month:9,  hours:102, note:"Неназначенная территория" },
  { id:"r84", year:2011, month:10, hours:76,  note:"" },
  { id:"r85", year:2011, month:11, hours:82,  note:"" },
  { id:"r86", year:2011, month:12, hours:97,  note:"" },
  { id:"r87", year:2012, month:1,  hours:77,  note:"4 года пионерского" },
  { id:"r88", year:2012, month:2,  hours:71,  note:"" },
  { id:"r89", year:2012, month:3,  hours:86,  note:"" },
  { id:"r90", year:2012, month:4,  hours:68,  note:"" },
  { id:"r91", year:2012, month:5,  hours:63,  note:"" },
  { id:"r92", year:2012, month:6,  hours:63,  note:"" },
  { id:"r93", year:2012, month:7,  hours:29,  note:"" },
  { id:"r94", year:2012, month:8,  hours:27,  note:"" },
  { id:"r95", year:2012, month:9,  hours:71,  note:"" },
  { id:"r96", year:2012, month:10, hours:82,  note:"" },
  { id:"r97", year:2012, month:11, hours:74,  note:"" },
  { id:"r98", year:2012, month:12, hours:74,  note:"" },
  { id:"r99", year:2013, month:1,  hours:79,  note:"5 лет пионерского" },
  { id:"r100",year:2013, month:2,  hours:68,  note:"" },
  { id:"r101",year:2013, month:3,  hours:65,  note:"" },
  { id:"r102",year:2013, month:4,  hours:65,  note:"" },
  { id:"r103",year:2013, month:5,  hours:66,  note:"" },
  { id:"r104",year:2013, month:6,  hours:75,  note:"" },
  { id:"r105",year:2013, month:7,  hours:68,  note:"" },
  { id:"r106",year:2013, month:8,  hours:56,  note:"" },
  { id:"r107",year:2013, month:9,  hours:75,  note:"" },
  { id:"r108",year:2013, month:10, hours:76,  note:"" },
  { id:"r109",year:2013, month:11, hours:88,  note:"" },
  { id:"r110",year:2013, month:12, hours:86,  note:"" },
  { id:"r111",year:2014, month:1,  hours:84,  note:"6 лет пионерского" },
  { id:"r112",year:2014, month:2,  hours:78,  note:"" },
  { id:"r113",year:2014, month:3,  hours:71,  note:"" },
  { id:"r114",year:2014, month:4,  hours:60,  note:"" },
  { id:"r115",year:2014, month:5,  hours:61,  note:"" },
  { id:"r116",year:2014, month:6,  hours:61,  note:"" },
  { id:"r117",year:2014, month:7,  hours:43,  note:"Продали дом, купили квартиру" },
  { id:"r118",year:2014, month:8,  hours:29,  note:"Школа пионеров Ейск +30ч" },
  { id:"r119",year:2014, month:9,  hours:73,  note:"" },
  { id:"r120",year:2014, month:10, hours:77,  note:"" },
  { id:"r121",year:2014, month:11, hours:72,  note:"" },
  { id:"r122",year:2014, month:12, hours:72,  note:"" },
  { id:"r123",year:2015, month:1,  hours:76,  note:"7 лет пионерского" },
  { id:"r124",year:2015, month:2,  hours:75,  note:"" },
  { id:"r125",year:2015, month:3,  hours:74,  note:"" },
  { id:"r126",year:2015, month:4,  hours:71,  note:"" },
  { id:"r127",year:2015, month:5,  hours:71,  note:"" },
  { id:"r128",year:2015, month:6,  hours:66,  note:"" },
  { id:"r129",year:2015, month:7,  hours:64,  note:"" },
  { id:"r130",year:2015, month:8,  hours:51,  note:"" },
  { id:"r131",year:2015, month:9,  hours:71,  note:"Снят с пионерского 14.09.2015" },
  { id:"r132",year:2015, month:10, hours:71,  note:"Переезд в Сочи" },
  { id:"r133",year:2015, month:11, hours:70,  note:"" },
  { id:"r134",year:2015, month:12, hours:71,  note:"" },
  { id:"r135",year:2016, month:1,  hours:72,  note:"" },
  { id:"r136",year:2016, month:2,  hours:76,  note:"" },
  { id:"r137",year:2016, month:3,  hours:55,  note:"Возобновил пионерское +16ч кредит" },
  { id:"r138",year:2016, month:4,  hours:62,  note:"Назначен ответственным за участки" },
  { id:"r139",year:2016, month:5,  hours:63,  note:"Назначен служителем группы 27.05" },
  { id:"r140",year:2016, month:6,  hours:47,  note:"" },
  { id:"r141",year:2016, month:7,  hours:45,  note:"" },
  { id:"r142",year:2016, month:8,  hours:48,  note:"" },
  { id:"r143",year:2016, month:9,  hours:52,  note:"Назначен служебным помощником 10.09" },
  { id:"r144",year:2016, month:10, hours:76,  note:"" },
  { id:"r145",year:2016, month:11, hours:86,  note:"" },
  { id:"r146",year:2016, month:12, hours:76,  note:"" },
  { id:"r147",year:2017, month:1,  hours:84,  note:"" },
  { id:"r148",year:2017, month:2,  hours:84,  note:"" },
  { id:"r149",year:2017, month:3,  hours:93,  note:"" },
  { id:"r150",year:2017, month:4,  hours:83,  note:"" },
  { id:"r151",year:2017, month:5,  hours:68,  note:"" },
  { id:"r152",year:2017, month:6,  hours:59,  note:"" },
  { id:"r153",year:2017, month:7,  hours:52,  note:"Летали в Барселону" },
  { id:"r154",year:2017, month:8,  hours:29,  note:"" },
  { id:"r155",year:2017, month:9,  hours:81,  note:"" },
  { id:"r156",year:2017, month:10, hours:75,  note:"Переезд в Малагу 05.10.2017" },
  { id:"r157",year:2017, month:11, hours:73,  note:"" },
  { id:"r158",year:2017, month:12, hours:63,  note:"" },
  { id:"r159",year:2018, month:1,  hours:75,  note:"" },
  { id:"r160",year:2018, month:2,  hours:76,  note:"" },
  { id:"r161",year:2018, month:3,  hours:69,  note:"" },
  { id:"r162",year:2018, month:4,  hours:70,  note:"Переезд в Бенидорм 22.04" },
  { id:"r163",year:2018, month:5,  hours:78,  note:"" },
  { id:"r164",year:2018, month:6,  hours:62,  note:"Объявили пионерами" },
  { id:"r165",year:2018, month:7,  hours:70,  note:"" },
  { id:"r166",year:2018, month:8,  hours:50,  note:"" },
  { id:"r167",year:2018, month:9,  hours:77,  note:"Переназначили служебным" },
  { id:"r168",year:2018, month:10, hours:72,  note:"" },
  { id:"r169",year:2018, month:11, hours:65,  note:"" },
  { id:"r170",year:2018, month:12, hours:60,  note:"" },
  { id:"r171",year:2019, month:1,  hours:79,  note:"" },
  { id:"r172",year:2019, month:2,  hours:74,  note:"" },
  { id:"r173",year:2019, month:3,  hours:71,  note:"" },
  { id:"r174",year:2019, month:4,  hours:68,  note:"" },
  { id:"r175",year:2019, month:5,  hours:72,  note:"" },
  { id:"r176",year:2019, month:6,  hours:66,  note:"" },
  { id:"r177",year:2019, month:7,  hours:66,  note:"" },
  { id:"r178",year:2019, month:8,  hours:33,  note:"Школа пионеров Мадрид" },
  { id:"r179",year:2019, month:9,  hours:71,  note:"" },
  { id:"r180",year:2019, month:10, hours:44,  note:"Купили квартиру в Батуми" },
  { id:"r181",year:2019, month:11, hours:62,  note:"" },
  { id:"r182",year:2019, month:12, hours:61,  note:"" },
  { id:"r183",year:2020, month:1,  hours:68,  note:"" },
  { id:"r184",year:2020, month:2,  hours:64,  note:"" },
  { id:"r185",year:2020, month:3,  hours:30,  note:"COVID карантин начался" },
  { id:"r186",year:2020, month:4,  hours:22,  note:"COVID карантин" },
  { id:"r187",year:2020, month:5,  hours:11,  note:"COVID карантин" },
  { id:"r188",year:2020, month:6,  hours:21,  note:"" },
  { id:"r189",year:2020, month:7,  hours:11,  note:"" },
  { id:"r190",year:2020, month:8,  hours:10,  note:"" },
  { id:"r191",year:2020, month:9,  hours:8,   note:"" },
  { id:"r192",year:2020, month:10, hours:10,  note:"" },
  { id:"r193",year:2020, month:11, hours:31,  note:"" },
  { id:"r194",year:2020, month:12, hours:17,  note:"" },
  { id:"r195",year:2021, month:1,  hours:12,  note:"" },
  { id:"r196",year:2021, month:2,  hours:17,  note:"" },
  { id:"r197",year:2021, month:3,  hours:15,  note:"" },
  { id:"r198",year:2021, month:4,  hours:9,   note:"" },
  { id:"r199",year:2021, month:5,  hours:11,  note:"" },
  { id:"r200",year:2021, month:6,  hours:21,  note:"" },
  { id:"r201",year:2021, month:7,  hours:18,  note:"" },
  { id:"r202",year:2021, month:8,  hours:25,  note:"" },
  { id:"r203",year:2021, month:9,  hours:24,  note:"" },
  { id:"r204",year:2021, month:10, hours:26,  note:"" },
  { id:"r205",year:2021, month:11, hours:38,  note:"" },
  { id:"r206",year:2021, month:12, hours:32,  note:"Назначен Старейшиной 26.12.2021" },
  { id:"r207",year:2022, month:1,  hours:32,  note:"" },
  { id:"r208",year:2022, month:2,  hours:31,  note:"" },
  { id:"r209",year:2022, month:3,  hours:26,  note:"" },
  { id:"r210",year:2022, month:4,  hours:29,  note:"Специальная речь" },
  { id:"r211",year:2022, month:5,  hours:29,  note:"" },
  { id:"r212",year:2022, month:6,  hours:34,  note:"" },
  { id:"r213",year:2022, month:7,  hours:31,  note:"" },
  { id:"r214",year:2022, month:8,  hours:38,  note:"" },
  { id:"r215",year:2022, month:9,  hours:40,  note:"" },
  { id:"r216",year:2022, month:10, hours:39,  note:"" },
  { id:"r217",year:2022, month:11, hours:37,  note:"" },
  { id:"r218",year:2022, month:12, hours:37,  note:"" },
  { id:"r219",year:2023, month:1,  hours:41,  note:"" },
  { id:"r220",year:2023, month:2,  hours:46,  note:"" },
  { id:"r221",year:2023, month:3,  hours:51,  note:"" },
  { id:"r222",year:2023, month:4,  hours:50,  note:"" },
  { id:"r223",year:2023, month:5,  hours:25,  note:"" },
  { id:"r224",year:2023, month:6,  hours:50,  note:"" },
  { id:"r225",year:2023, month:7,  hours:48,  note:"" },
  { id:"r226",year:2023, month:8,  hours:58,  note:"" },
  { id:"r227",year:2023, month:9,  hours:49,  note:"" },
  { id:"r228",year:2023, month:10, hours:46,  note:"" },
  { id:"r229",year:2023, month:11, hours:44,  note:"" },
  { id:"r230",year:2023, month:12, hours:50,  note:"" },
  { id:"r231",year:2024, month:1,  hours:40,  note:"" },
  { id:"r232",year:2024, month:2,  hours:38,  note:"" },
  { id:"r233",year:2024, month:3,  hours:45,  note:"" },
  { id:"r234",year:2024, month:4,  hours:37,  note:"" },
  { id:"r235",year:2024, month:5,  hours:38,  note:"Переезд в Хихон 09.05.2024" },
  { id:"r236",year:2024, month:6,  hours:41,  note:"" },
  { id:"r237",year:2024, month:7,  hours:32,  note:"" },
  { id:"r238",year:2024, month:8,  hours:41,  note:"" },
  { id:"r239",year:2024, month:9,  hours:50,  note:"" },
  { id:"r240",year:2024, month:10, hours:50,  note:"" },
  { id:"r241",year:2024, month:11, hours:42,  note:"" },
  { id:"r242",year:2024, month:12, hours:28,  note:"" },
  { id:"r243",year:2025, month:1,  hours:48,  note:"" },
  { id:"r244",year:2025, month:2,  hours:48,  note:"" },
  { id:"r245",year:2025, month:3,  hours:39,  note:"" },
  { id:"r246",year:2025, month:4,  hours:52,  note:"" },
  { id:"r247",year:2025, month:5,  hours:51,  note:"" },
  { id:"r248",year:2025, month:6,  hours:50,  note:"" },
  { id:"r249",year:2025, month:7,  hours:50,  note:"" },
  { id:"r250",year:2025, month:8,  hours:50,  note:"" },
  { id:"r251",year:2025, month:9,  hours:44,  note:"" },
  { id:"r252",year:2025, month:10, hours:50,  note:"" },
  { id:"r253",year:2025, month:11, hours:30,  note:"Школа пионеров Аликанте +30ч кредит" },
  { id:"r254",year:2025, month:12, hours:42,  note:"Болели 10 дней" },
  { id:"r255",year:2026, month:1,  hours:55,  note:"Конгресс в Барселоне, молитва и комментарий" },
  { id:"r256",year:2026, month:2,  hours:44,  note:"" },
  { id:"r257",year:2026, month:3,  hours:55,  note:"Посещение зам. рай. Филипе Соуза 10 марта" },
  { id:"r258",year:2026, month:4,  hours:50,  note:"" },
  { id:"r259",year:2026, month:5,  hours:43,  note:"Назначен помощником проводить Сторожевую 24.05. Конгресс 30.05" },
  { id:"r260",year:2026, month:6,  hours:54,  note:"+4 кредитных часа" },
];

const SEED_EVENTS = [
  { id:"e1",  date:"1992-04-12", title:"Крещение", category:"personal" },
  { id:"e2",  date:"2004-02-01", title:"Подсобное пионерское служение", category:"pioneer" },
  { id:"e3",  date:"2004-05-01", title:"Начало общего пионерского", category:"pioneer" },
  { id:"e4",  date:"2004-11-01", title:"Смещён с пионерского", category:"other" },
  { id:"e5",  date:"2005-02-25", title:"Свадьба со Снежаной", category:"personal" },
  { id:"e6",  date:"2007-03-01", title:"Переезд в Каневскую", category:"move" },
  { id:"e7",  date:"2008-03-01", title:"Начало регулярного пионерского служения", category:"pioneer" },
  { id:"e8",  date:"2009-07-01", title:"Переезд в Саранск", category:"move" },
  { id:"e9",  date:"2009-08-01", title:"Школа пионеров — Саранск (+40ч кредит)", category:"school" },
  { id:"e10", date:"2010-01-01", title:"Переезд в Новоминскую", category:"move" },
  { id:"e11", date:"2014-08-01", title:"Школа пионеров — Ейск (+30ч кредит)", category:"school" },
  { id:"e12", date:"2015-09-14", title:"Снят с пионерского на 6 месяцев", category:"other" },
  { id:"e13", date:"2015-10-01", title:"Переезд в Сочи", category:"move" },
  { id:"e14", date:"2016-03-01", title:"Возобновил пионерское служение", category:"pioneer" },
  { id:"e15", date:"2016-05-27", title:"Назначен служителем группы", category:"appointment" },
  { id:"e16", date:"2016-09-10", title:"Назначен служебным помощником", category:"appointment" },
  { id:"e17", date:"2017-10-05", title:"Переезд в Испанию — Малага", category:"move" },
  { id:"e18", date:"2018-04-22", title:"Переезд в Бенидорм", category:"move" },
  { id:"e19", date:"2019-08-01", title:"Школа пионеров — Мадрид", category:"school" },
  { id:"e20", date:"2021-12-26", title:"Назначен Старейшиной", category:"appointment" },
  { id:"e21", date:"2022-04-01", title:"Специальная речь", category:"appointment" },
  { id:"e22", date:"2024-05-09", title:"Переезд в Хихон, Астурия", category:"move" },
  { id:"e23", date:"2025-11-01", title:"Школа пионеров — Аликанте (+30ч кредит)", category:"school" },
  { id:"e24", date:"2026-03-12", title:"Заявление G-8 (действует до 12.03.2027)", category:"appointment" },
  { id:"e25", date:"2026-05-24", title:"Назначен помощником проводить Сторожевую", category:"appointment" },
];

const SEED_TALKS = [
  { id:"t1", date:"2021-10-24", number:50,  title:"Как принимать мудрые решения",                           location:"Бенидорм" },
  { id:"t2", date:"2022-04-10", number:123, title:"Вы можете обрести твёрдую надежду! (S-123-22)",          location:"Бенидорм" },
  { id:"t3", date:"2025-02-09", number:50,  title:"Как принимать мудрые решения",                           location:"Хихон" },
  { id:"t4", date:"2025-06-15", number:1,   title:"Хорошо ли вы знаете Бога?",                              location:"Хихон" },
  { id:"t5", date:"2025-11-20", number:1,   title:"Хорошо ли вы знаете Бога?",                              location:"Бенидорм" },
  { id:"t6", date:"2026-06-28", number:75,  title:"Подчиняйтесь Богу как правителю во всех областях жизни", location:"Хихон" },
];

const SK_R = "sj_r_v7", SK_E = "sj_e_v7", SK_T = "sj_t_v7";

function load(key, seed) {
  try { const r = localStorage.getItem(key); if (r) return JSON.parse(r); } catch {}
  return seed;
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

const MN = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const MF = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

function svcYear(y, m) {
  return m >= 9 ? (y + "\u2013" + (y+1)) : ((y-1) + "\u2013" + y);
}

function groupBySY(records) {
  const map = {};
  records.forEach(r => {
    const sy = svcYear(r.year, r.month);
    if (!map[sy]) map[sy] = { sy, records: [], total: 0 };
    map[sy].records.push(r);
    map[sy].total += r.hours;
  });
  return Object.values(map).sort((a,b) => a.sy.localeCompare(b.sy));
}

const CAT = {
  pioneer:     { label:"Пионерство",  bg:"#dbeafe", tx:"#1e40af", dot:"#3b82f6" },
  appointment: { label:"Назначение",  bg:"#dcfce7", tx:"#166534", dot:"#22c55e" },
  move:        { label:"Переезд",     bg:"#fef9c3", tx:"#854d0e", dot:"#eab308" },
  school:      { label:"Школа",       bg:"#ede9fe", tx:"#5b21b6", dot:"#8b5cf6" },
  personal:    { label:"Личное",      bg:"#fce7f3", tx:"#9d174d", dot:"#ec4899" },
  other:       { label:"Событие",     bg:"#f1f5f9", tx:"#475569", dot:"#94a3b8" },
};

const uid = () => "x" + Date.now() + Math.random().toString(36).slice(2,5);

const navy = "#0f2744", blue = "#1e3a5f", accent = "#3b82f6";
const light = "#f0f6ff", border = "#e2e8f0", muted = "#94a3b8", text = "#1e293b";

function Badge({ cat }) {
  const c = CAT[cat] || CAT.other;
  return (
    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:c.bg, color:c.tx, fontWeight:600, whiteSpace:"nowrap" }}>
      {c.label}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"white", borderRadius:16, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 20px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:700, fontSize:15, color:text }}>{title}</span>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", fontSize:22, color:muted, lineHeight:1 }}>x</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:blue, marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:14, boxSizing:"border-box", outline:"none", fontFamily:"inherit" };

export default function App() {
  const [records, setRecords] = useState(() => load(SK_R, SEED_RECORDS));
  const [events,  setEvents]  = useState(() => load(SK_E, SEED_EVENTS));
  const [talks,   setTalks]   = useState(() => load(SK_T, SEED_TALKS));
  const [tab, setTab]         = useState("dashboard");
  const [modal, setModal]     = useState(null);
  const [filterCat, setFC]    = useState("all");
  const [searchQ, setQ]       = useState("");
  const [editRec, setEditRec] = useState(null);
  const [editEv,  setEditEv]  = useState(null);
  const [editTlk, setEditTlk] = useState(null);

  useEffect(() => { save(SK_R, records); }, [records]);
  useEffect(() => { save(SK_E, events);  }, [events]);
  useEffect(() => { save(SK_T, talks);   }, [talks]);

  const totalHours = records.reduce((s,r) => s + r.hours, 0);
  const groups     = groupBySY(records);
  const maxH       = Math.max(...groups.map(g => g.total));
  const curYear    = groups[groups.length - 1];

  function saveRec(f) {
    const rec = { id: f.id || uid(), year:+f.year, month:+f.month, hours:+f.hours, note:f.note||"" };
    if (f.id) setRecords(rs => rs.map(x => x.id === f.id ? rec : x));
    else setRecords(rs => [...rs, rec]);
    setModal(null); setEditRec(null);
  }
  function delRec(id) { setRecords(rs => rs.filter(x => x.id !== id)); setModal(null); setEditRec(null); }

  function saveEv(f) {
    const ev = { id: f.id || uid(), date:f.date, title:f.title, category:f.category||"other" };
    if (f.id) setEvents(es => es.map(x => x.id === f.id ? ev : x));
    else setEvents(es => [...es, ev]);
    setModal(null); setEditEv(null);
  }
  function delEv(id) { setEvents(es => es.filter(x => x.id !== id)); setModal(null); setEditEv(null); }

  function saveTlk(f) {
    const t = { id: f.id || uid(), date:f.date, number:f.number ? +f.number : null, title:f.title||"", location:f.location||"" };
    if (f.id) setTalks(ts => ts.map(x => x.id === f.id ? t : x));
    else setTalks(ts => [...ts, t]);
    setModal(null); setEditTlk(null);
  }
  function delTlk(id) { setTalks(ts => ts.filter(x => x.id !== id)); setModal(null); setEditTlk(null); }

  const filtEv = events
    .filter(e => filterCat === "all" || e.category === filterCat)
    .filter(e => !searchQ || e.title.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a,b) => a.date.localeCompare(b.date));

  const tabs = [
    ["dashboard","Главная"],
    ["hours","Часы"],
    ["timeline","События"],
    ["talks","Речи"],
    ["add","+ Добавить"],
  ];

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#f8fafc", minHeight:"100vh" }}>

      <div style={{ background:"linear-gradient(135deg, #0f2744 0%, #1e3a5f 100%)", color:"white", padding:"24px 20px 20px" }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>
          <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", opacity:0.5, marginBottom:6 }}>Журнал служения</div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800 }}>Ткач Алексей Викторович</h1>
          <div style={{ marginTop:14, display:"flex", gap:20, flexWrap:"wrap" }}>
            {[["Крещён","12.04.1992"],["Пионер с","Март 2008"],["Стаж","17 лет 9 мес."],["G-8","до 12.03.2027"]].map(([l,v]) => (
              <div key={l}>
                <div style={{ fontSize:9, opacity:0.55, textTransform:"uppercase", letterSpacing:1 }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:700, marginTop:1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:20 }}>
        <div style={{ maxWidth:860, margin:"0 auto", display:"flex", overflowX:"auto" }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding:"13px 16px", border:"none", background:"none", cursor:"pointer",
              fontSize:13, fontWeight: tab === id ? 700 : 400, whiteSpace:"nowrap",
              color: tab === id ? blue : muted,
              borderBottom: tab === id ? ("2px solid " + accent) : "2px solid transparent",
              transition:"all 0.15s",
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"20px 16px" }}>

        {tab === "dashboard" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginBottom:20 }}>
              {[
                { label:"Всего часов",    value:totalHours.toLocaleString(), color:accent },
                { label:"Лет пионером",   value:"17.9",                      color:"#22c55e" },
                { label:"Служ. лет",      value:groups.length,               color:"#8b5cf6" },
                { label:"Публичных речей",value:talks.length,                color:"#f43f5e" },
                { label:"Школы пионеров", value:4,                           color:"#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ background:"white", borderRadius:12, padding:"14px", boxShadow:"0 1px 4px rgba(0,0,0,0.07)", borderTop:"3px solid " + s.color }}>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:24, fontWeight:800, color:text }}>{s.value}</div>
                </div>
              ))}
            </div>

            {curYear && (
              <div style={{ background:"white", borderRadius:12, padding:18, boxShadow:"0 1px 4px rgba(0,0,0,0.07)", marginBottom:16 }}>
                <div style={{ fontSize:12, color:muted, marginBottom:4 }}>Текущий служебный год</div>
                <div style={{ fontSize:18, fontWeight:800, color:blue, marginBottom:14 }}>{curYear.sy} — {curYear.total} ч.</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                  {[...curYear.records].sort((a,b) => a.year !== b.year ? a.year - b.year : a.month - b.month).map(r => (
                    <button key={r.id} onClick={() => { setEditRec(r); setModal("rec"); }}
                      style={{ background:light, border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 6px", cursor:"pointer", textAlign:"center" }}>
                      <div style={{ fontSize:10, color:muted }}>{MN[r.month-1]} {r.year}</div>
                      <div style={{ fontSize:15, fontWeight:700, color:blue }}>{r.hours}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background:"white", borderRadius:12, padding:18, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:12 }}>Последние события</div>
              {[...events].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5).map(ev => (
                <div key={ev.id} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:(CAT[ev.category]||CAT.other).dot, marginTop:5, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:text }}>{ev.title}</div>
                    <div style={{ fontSize:11, color:muted }}>{ev.date}</div>
                  </div>
                  <Badge cat={ev.category} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "hours" && (
          <div style={{ background:"white", borderRadius:12, padding:18, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:14 }}>Часы по служебным годам</div>
            {groups.map(g => {
              const pct = Math.round((g.total / maxH) * 100);
              const low = g.total < 300;
              return (
                <div key={g.sy} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:text }}>{g.sy}</span>
                    <span style={{ fontSize:12, fontWeight:700, color: low ? "#f59e0b" : blue }}>{g.total} ч.</span>
                  </div>
                  <div style={{ background:"#f1f5f9", borderRadius:6, height:10, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:6, width: pct + "%", background: low ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#1e3a5f,#3b82f6)" }} />
                  </div>
                  <div style={{ display:"flex", gap:3, marginTop:6, flexWrap:"wrap" }}>
                    {[...g.records].sort((a,b) => a.year !== b.year ? a.year - b.year : a.month - b.month).map(r => (
                      <button key={r.id}
                        title={MF[r.month-1] + " " + r.year + ": " + r.hours + "ч." + (r.note ? " · " + r.note : "")}
                        onClick={() => { setEditRec(r); setModal("rec"); }}
                        style={{ fontSize:9, padding:"2px 5px", borderRadius:5, border:"1px solid #e2e8f0",
                          background: r.hours >= 70 ? "#dbeafe" : r.hours >= 40 ? "#f0f6ff" : "#fef9c3",
                          color:text, cursor:"pointer" }}>
                        {MN[r.month-1]}: {r.hours}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "timeline" && (
          <div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
              <input value={searchQ} onChange={e => setQ(e.target.value)} placeholder="Поиск..."
                style={{ ...inp, width:180, padding:"6px 12px" }} />
              {["all", ...Object.keys(CAT)].map(cat => (
                <button key={cat} onClick={() => setFC(cat)} style={{
                  padding:"5px 12px", borderRadius:20, border:"1px solid", fontSize:12, cursor:"pointer",
                  background: filterCat === cat ? blue : "white",
                  color: filterCat === cat ? "white" : muted,
                  borderColor: filterCat === cat ? blue : border,
                  fontWeight: filterCat === cat ? 700 : 400,
                }}>
                  {cat === "all" ? "Все" : CAT[cat].label}
                </button>
              ))}
            </div>
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute", left:14, top:0, bottom:0, width:2, background:border }} />
              {filtEv.map(ev => {
                const c = CAT[ev.category] || CAT.other;
                return (
                  <div key={ev.id} style={{ display:"flex", gap:14, marginBottom:14, position:"relative" }}>
                    <div style={{ width:30, flexShrink:0, display:"flex", justifyContent:"center", paddingTop:6 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:c.dot, border:"2px solid white", outline:"2px solid " + c.dot }} />
                    </div>
                    <div style={{ flex:1, background:"white", borderRadius:10, padding:"12px 14px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)", border:"1px solid #e2e8f0" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:text }}>{ev.title}</div>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <Badge cat={ev.category} />
                          <button onClick={() => { setEditEv(ev); setModal("ev"); }}
                            style={{ border:"none", background:"none", cursor:"pointer", fontSize:14, color:muted, padding:2 }}>
                            edit
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:muted, marginTop:3 }}>{ev.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "talks" && (
          <div>
            <div style={{ background:"white", borderRadius:12, padding:18, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:text }}>Публичные речи</div>
                  <div style={{ fontSize:11, color:muted, marginTop:2 }}>Всего: {talks.length}</div>
                </div>
                <button onClick={() => { setEditTlk({}); setModal("tlk"); }}
                  style={{ background:blue, color:"white", border:"none", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontSize:12, fontWeight:700 }}>
                  + Добавить
                </button>
              </div>
              {[...talks].sort((a,b) => b.date.localeCompare(a.date)).map(t => (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #e2e8f0" }}>
                  <div style={{ width:48, height:48, borderRadius:10, background:light, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {t.number
                      ? <span style={{ fontSize:16, fontWeight:800, color:blue }}>{t.number}</span>
                      : <span style={{ fontSize:18 }}>*</span>
                    }
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:text }}>
                      {t.title || (t.number ? ("Речь №" + t.number) : "Специальная речь")}
                    </div>
                    <div style={{ fontSize:11, color:muted, marginTop:3 }}>
                      {t.date}{t.location ? ("  —  " + t.location) : ""}
                    </div>
                  </div>
                  <button onClick={() => { setEditTlk(t); setModal("tlk"); }}
                    style={{ border:"none", background:"none", cursor:"pointer", fontSize:13, color:muted, padding:4 }}>
                    ✏
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "add" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4 }}>Добавить месяц (часы)</div>
              <div style={{ fontSize:12, color:muted, marginBottom:16 }}>Запишите часы за конкретный месяц</div>
              <RecForm onSave={saveRec} />
            </div>
            <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4 }}>Добавить событие</div>
              <div style={{ fontSize:12, color:muted, marginBottom:16 }}>Переезд, назначение, школа и т.д.</div>
              <EvForm onSave={saveEv} />
            </div>
            <div style={{ background:"white", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4 }}>Добавить речь</div>
              <div style={{ fontSize:12, color:muted, marginBottom:16 }}>Публичная речь с номером и датой</div>
              <TlkForm onSave={saveTlk} />
            </div>
          </div>
        )}
      </div>

      {modal === "rec" && editRec && (
        <Modal title="Редактировать запись" onClose={() => { setModal(null); setEditRec(null); }}>
          <RecForm initial={editRec} onSave={saveRec}
            onDelete={() => { if (window.confirm("Удалить?")) delRec(editRec.id); }} />
        </Modal>
      )}
      {modal === "ev" && editEv && (
        <Modal title="Редактировать событие" onClose={() => { setModal(null); setEditEv(null); }}>
          <EvForm initial={editEv} onSave={saveEv}
            onDelete={() => { if (window.confirm("Удалить?")) delEv(editEv.id); }} />
        </Modal>
      )}
      {modal === "tlk" && editTlk !== null && (
        <Modal title={editTlk.id ? "Редактировать речь" : "Добавить речь"} onClose={() => { setModal(null); setEditTlk(null); }}>
          <TlkForm initial={editTlk} onSave={saveTlk}
            onDelete={editTlk.id ? () => { if (window.confirm("Удалить?")) delTlk(editTlk.id); } : null} />
        </Modal>
      )}
    </div>
  );
}

function RecForm({ initial, onSave, onDelete }) {
  const now = new Date();
  const [f, setF] = useState({ year: now.getFullYear(), month: now.getMonth()+1, hours:"", note:"", ...initial, hours: initial ? initial.hours : "" });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        <Field label="Год"><input type="number" value={f.year} onChange={set("year")} style={inp} min={2003} max={2030} /></Field>
        <Field label="Месяц">
          <select value={f.month} onChange={set("month")} style={inp}>
            {MF.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Часы"><input type="number" value={f.hours} onChange={set("hours")} style={inp} min={0} max={200} /></Field>
      </div>
      <Field label="Заметка"><input value={f.note} onChange={set("note")} style={inp} placeholder="Необязательно" /></Field>
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <button onClick={() => onSave(f)} style={{ flex:1, padding:"10px", background:blue, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Сохранить</button>
        {onDelete && <button onClick={onDelete} style={{ padding:"10px 14px", background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Del</button>}
      </div>
    </div>
  );
}

function EvForm({ initial, onSave, onDelete }) {
  const [f, setF] = useState({ date:"", title:"", category:"other", ...initial });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <Field label="Дата"><input type="date" value={f.date} onChange={set("date")} style={inp} /></Field>
      <Field label="Название"><input value={f.title} onChange={set("title")} style={inp} placeholder="Что произошло?" /></Field>
      <Field label="Категория">
        <select value={f.category} onChange={set("category")} style={inp}>
          {Object.entries(CAT).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </Field>
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <button onClick={() => onSave(f)} style={{ flex:1, padding:"10px", background:blue, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Сохранить</button>
        {onDelete && <button onClick={onDelete} style={{ padding:"10px 14px", background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Del</button>}
      </div>
    </div>
  );
}

function TlkForm({ initial, onSave, onDelete }) {
  const [f, setF] = useState({ date:"", number:"", title:"", location:"", ...initial, number: initial ? (initial.number || "") : "" });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Field label="Дата"><input type="date" value={f.date} onChange={set("date")} style={inp} /></Field>
        <Field label="Номер речи"><input type="number" value={f.number} onChange={set("number")} style={inp} placeholder="Напр. 75" min={1} max={250} /></Field>
      </div>
      <Field label="Название речи"><input value={f.title} onChange={set("title")} style={inp} placeholder="Необязательно" /></Field>
      <Field label="Место / Собрание"><input value={f.location} onChange={set("location")} style={inp} placeholder="Напр. Хихон" /></Field>
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <button onClick={() => onSave(f)} style={{ flex:1, padding:"10px", background:blue, color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Сохранить</button>
        {onDelete && <button onClick={onDelete} style={{ padding:"10px 14px", background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700 }}>Del</button>}
      </div>
    </div>
  );
}
