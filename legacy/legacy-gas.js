var props = PropertiesService.getScriptProperties();
var SCHEDULE_ID = props.getProperty('SCHEDULE_ID') || '1YhbjTuymC1-txIGLgw-5SC2MOhlD3dgwLbGYjRFP-YA';
var LINKS_ID    = props.getProperty('LINKS_ID')    || '11gB12qLmMfFCpm8RsxZsvXP9Xz9raEDGvigg0N82KZ8';
function isWeekendDate(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var day = d.getDay();
  return day === 0 || day === 6;
}

// HTML 페이지 서빙
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('개별지도 통합자료')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// =====================================================
// 날짜 탭 자동 생성 (전체 날짜, 튜터 필터 없음)
// =====================================================
function getAvailableDates() {
  var ss = SpreadsheetApp.openById(SCHEDULE_ID);
  var sheets = ss.getSheets();
  var year = new Date().getFullYear();
  var dates = [];
  sheets.forEach(function(sheet) {
    var name = sheet.getName().trim();
    var match = name.match(/^(\d{1,2})\/(\d{1,2})/);
    if (!match) return;
    var m = parseInt(match[1]);
    var d = parseInt(match[2]);
    var dateKey = year + '-'
      + (m < 10 ? '0' : '') + m + '-'
      + (d < 10 ? '0' : '') + d;
    dates.push({
      dateKey: dateKey,
      label  : name,
      gid    : String(sheet.getSheetId())
    });
  });
  dates.sort(function(a, b) { return a.dateKey.localeCompare(b.dateKey); });
  return { dates: dates };
}

// =====================================================
// 셀값 → 문자열 (Date 객체 / 시간 fraction 처리)
// =====================================================
function cellToStr(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    var h = val.getHours(), m = val.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  if (typeof val === 'number' && val > 0 && val < 1) {
    var mins = Math.round(val * 1440);
    var hh = Math.floor(mins / 60), mm = mins % 60;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }
  return String(val);
}

function isKoreanName(s) {
  return /^[가-힣]{2,5}[A-Z]?$/.test(s.trim());
}

function parseStudentCell(val) {
  var s = cellToStr(val).trim();
  if (!s) return null;
  var parts = s.split(' ');
  if (parts.length < 2) return null;
  var clipboard = parts[parts.length - 1];
  if (!/^\d+$/.test(clipboard)) return null;
  var name = parts[0];
  if (!isKoreanName(name)) return null;
  return { name: name, subject: parts.slice(1, -1).join(' '), clipboard: clipboard };
}

// =====================================================
// 통합자료 링크 시트에서 학생별 하이퍼링크 추출
// =====================================================
function getLinkMap() {
  try {
    var ss    = SpreadsheetApp.openById(LINKS_ID);
    var sheet = ss.getSheetByName('링크');
    if (!sheet) return { links: {}, managerMap: {}, error: '링크 시트를 찾지 못했어요' };
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return { links: {}, managerMap: {} };
    var range    = sheet.getRange(1, 1, lastRow, lastCol);
    var richVals = range.getRichTextValues();
    var dispVals = range.getDisplayValues();
    var formulas = range.getFormulas();
    // 1행: 컬럼 헤더에서 매니저 이름 추출 (예: "홍길동M(박교실장)" → "홍길동")
    var colToManager = {};
    if (dispVals.length > 0) {
      for (var c = 0; c < dispVals[0].length; c++) {
        var h = dispVals[0][c].trim();
        if (!h) continue;
        var mIdx = h.indexOf('M(');
        var managerName = (mIdx > 0) ? h.substring(0, mIdx).trim() : h;
        if (managerName) colToManager[c] = managerName;
      }
    }
    var links = {};
    var managerMap = {};
    for (var r = 0; r < richVals.length; r++) {
      for (var c = 0; c < richVals[r].length; c++) {
        var url = richVals[r][c].getLinkUrl();
        if (!url) {
          var m = formulas[r][c].match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
          if (m) url = m[1];
        }
        if (!url) continue;
        var text = dispVals[r][c].trim();
        if (text) {
          links[text] = url;
          if (colToManager[c]) managerMap[text] = colToManager[c];
        }
      }
    }
    return { links: links, managerMap: managerMap };
  } catch(e) {
    return { links: {}, managerMap: {}, error: e.toString() };
  }
}

// =====================================================
// 튜터 목록만 빠르게 반환 (날짜 선택 시 자동완성용)
// =====================================================
function getTutorList(gid, dateStr) {
  if (!gid) return { tutors: [] };
  var ss = SpreadsheetApp.openById(SCHEDULE_ID);
  var sheets = ss.getSheets();
  var sheet = null;
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === String(gid)) { sheet = sheets[i]; break; }
  }
  if (!sheet) return { tutors: [] };
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 80);
  var raw = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var maxBlocks = (dateStr && isWeekendDate(dateStr)) ? 6 : 3;
  var blockCount = 0;
  var tutorSet = {};
  for (var r = 0; r < raw.length; r++) {
    if (cellToStr(raw[r][18]).trim() === '튜터') {
      if (blockCount >= maxBlocks) break;
      blockCount++;
      for (var ci = 19; ci < lastCol; ci++) {
        var tName = cellToStr(raw[r][ci]).trim();
        if (tName && isKoreanName(tName)) tutorSet[tName] = true;
      }
    }
  }
  return { tutors: Object.keys(tutorSet).sort() };
}

// =====================================================
// 핵심 함수 — 특정 날짜·튜터의 수업 데이터 반환
// =====================================================
function getScheduleData(date, tutor, gid) {
  if (!gid) return { error: '시트 정보가 없어요. 날짜를 다시 선택해주세요.' };
  var ss = SpreadsheetApp.openById(SCHEDULE_ID);
  var sheet = null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === String(gid)) {
      sheet = sheets[i];
      break;
    }
  }
  if (!sheet) return { error: '시트를 찾을 수 없어요 (GID: ' + gid + ')' };
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 80);
  var raw = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var tutorRowIndices = [];
  for (var r = 0; r < raw.length; r++) {
    if (cellToStr(raw[r][18]).trim() === '튜터') tutorRowIndices.push(r);
  }
  var blockNames = isWeekendDate(date) ? ['A','B','C','D','E','F'] : ['D','E','F'];
  var blocks = {};
  var allTutorSet = {};
  for (var bi = 0; bi < Math.min(tutorRowIndices.length, blockNames.length); bi++) {
    var tutorRowIdx = tutorRowIndices[bi];
    var blockName   = blockNames[bi];
    var nextIdx     = tutorRowIndices[bi + 1] || raw.length;
    var tutorRow    = raw[tutorRowIdx];
    var colToTutor = {};
    for (var ci = 19; ci < lastCol; ci++) {
      var tName = cellToStr(tutorRow[ci]).trim();
      if (tName && isKoreanName(tName)) {
        colToTutor[ci] = tName;
        allTutorSet[tName] = true;
      }
    }
    if (!tutor) continue;
    var tutorCol = -1;
    for (var ci2 = 19; ci2 < lastCol; ci2++) {
      if (cellToStr(tutorRow[ci2]).trim() === tutor) { tutorCol = ci2; break; }
    }
    if (tutorCol === -1) continue;
    var zariRow   = raw[tutorRowIdx - 1] || [];
    var roomLabel = cellToStr(zariRow[tutorCol]).trim();
    var roomMatch = roomLabel.match(/^(.+?)\s+(\d+)~(\d+)$/);
    var roomType  = roomMatch ? roomMatch[1].trim() : '';
    var roomStart = roomMatch ? parseInt(roomMatch[2]) : 0;
    var arrivalRow = raw[tutorRowIdx + 1] || [];
    var students = [];
    for (var ri = tutorRowIdx + 2; ri < nextIdx; ri++) {
      if (students.length >= 3) break;
      var row   = raw[ri] || [];
      var col17 = cellToStr(row[17]).trim();
      var col18s = cellToStr(row[18]).trim();
      var isStudentRow =
        col17.indexOf('학습정비') >= 0 ||
        col17.indexOf('콤마')     >= 0 ||
        col17 === '~'              ||
        /^\d{2}:\d{2}$/.test(col18s);
      if (isStudentRow) {
        var st = parseStudentCell(row[tutorCol]);
        if (st) {
          var seatIdx = students.length;
          st.seat = roomType
            ? (roomType + ' ' + (roomStart + seatIdx) + '번')
            : String(seatIdx + 1);
          students.push(st);
        }
      }
    }
    blocks[blockName] = {
      arrival : cellToStr(arrivalRow[tutorCol]).trim(),
      students: students
    };
  }
  return {
    tutorFound: tutor ? Object.keys(blocks).length > 0 : false,
    blocks    : blocks,
    allTutors : Object.keys(allTutorSet).sort()
  };
}

// =====================================================
// 이번 주 스케줄 — 해당 튜터가 출근하는 날짜·블록·출근시간 반환
// =====================================================
function getWeeklySchedule(tutorName) {
  if (!tutorName) return { days: [] };

  var today = new Date();
  var year  = today.getFullYear();

  // 이번 주 월요일 구하기 (일=0이면 -6, 그 외 1-요일)
  var dow = today.getDay();
  var mondayOffset = (dow === 0) ? -6 : (1 - dow);
  var monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  // 이번 주 날짜 키 집합 (월~일, 7개)
  var weekDateSet = {};
  for (var i = 0; i < 7; i++) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    var m  = d.getMonth() + 1;
    var dy = d.getDate();
    var key = year + '-' + (m < 10 ? '0' : '') + m + '-' + (dy < 10 ? '0' : '') + dy;
    weekDateSet[key] = true;
  }

  var ss = SpreadsheetApp.openById(SCHEDULE_ID);
  var sheets = ss.getSheets();
  var result = [];

  sheets.forEach(function(sheet) {
    var name = sheet.getName().trim();
    var match = name.match(/^(\d{1,2})\/(\d{1,2})/);
    if (!match) return;
    var m  = parseInt(match[1]);
    var dy = parseInt(match[2]);
    var dateKey = year + '-' + (m < 10 ? '0' : '') + m + '-' + (dy < 10 ? '0' : '') + dy;
    if (!weekDateSet[dateKey]) return;

    var gid     = String(sheet.getSheetId());
    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), 80);
    var raw     = sheet.getRange(1, 1, lastRow, lastCol).getValues();

    var blockNames = isWeekendDate(dateKey) ? ['A','B','C','D','E','F'] : ['D','E','F'];
    var tutorRowIndices = [];
    for (var r = 0; r < raw.length; r++) {
      if (cellToStr(raw[r][18]).trim() === '튜터') tutorRowIndices.push(r);
    }

    var dayBlocks    = [];
    var firstArrival = '';

    for (var bi = 0; bi < Math.min(tutorRowIndices.length, blockNames.length); bi++) {
      var tutorRowIdx = tutorRowIndices[bi];
      var blockName   = blockNames[bi];
      var nextIdx     = tutorRowIndices[bi + 1] || raw.length;
      var tutorRow    = raw[tutorRowIdx];

      var tutorCol = -1;
      for (var ci = 19; ci < lastCol; ci++) {
        if (cellToStr(tutorRow[ci]).trim() === tutorName) { tutorCol = ci; break; }
      }
      if (tutorCol === -1) continue;

      var arrivalRow = raw[tutorRowIdx + 1] || [];
      var arrival    = cellToStr(arrivalRow[tutorCol]).trim();
      if (!firstArrival && arrival) firstArrival = arrival;

      // 학생 수 카운트
      var studentCount = 0;
      for (var ri = tutorRowIdx + 2; ri < nextIdx; ri++) {
        if (studentCount >= 3) break;
        var row   = raw[ri] || [];
        var col17 = cellToStr(row[17]).trim();
        var col18s = cellToStr(row[18]).trim();
        var isStudentRow =
          col17.indexOf('학습정비') >= 0 ||
          col17.indexOf('콤마')     >= 0 ||
          col17 === '~'              ||
          /^\d{2}:\d{2}$/.test(col18s);
        if (isStudentRow) {
          var st = parseStudentCell(row[tutorCol]);
          if (st) studentCount++;
        }
      }

      dayBlocks.push({ block: blockName, arrival: arrival, studentCount: studentCount });
    }

    if (dayBlocks.length > 0) {
      result.push({
        dateKey : dateKey,
        label   : name,
        gid     : gid,
        arrival : firstArrival,
        blocks  : dayBlocks
      });
    }
  });

  result.sort(function(a, b) { return a.dateKey.localeCompare(b.dateKey); });
  return { days: result };
}
