//Time Card using Full Calendar.js
//#region Global Variables
var calendar;
let timecards = [];
let nextTimecardId = 1;
var clickedTimecard = {}

const userColorMapping = {
    '1e5bb44ec77845c69a10d01df47d3f25': { bgColor: '#b8255f', textColor: '#ffffff', userName: 'Nathan' },
    '212a4d7d6f724ca9a4bb881769e5d47d': { bgColor: '#280353', textColor: '#ffffff', userName: 'Daniel' },
    '06c836a659904b9c8b0419682f7d4728': { bgColor: '#6accbc', textColor: '#000000', userName: 'Ron' },
    'd8191d0baac14244a11ff87470122b6d': { bgColor: '#14aaf6', textColor: '#ffffff', userName: 'Tyler' }
};

let usersArray = [];

//#endregion Global Variables

//#region Event Handlers

function addUserTimecard(startTime, endTime) {
    // Initialize title, notes, and related_to as empty for new timecards
    const title = "";
    const notes = "";
    const related_to = "";

    // Call the refactored Swal form function
    showAddTimecardForm('Add Timecard', formatDatetimeForInput(startTime), formatDatetimeForInput(endTime), (formData) => {
        if (formData.title && formData.start && formData.end) {
            const isValid = formData.start < formData.end;
            if (isValid) {
                const newUserTimecard = {
                    id: generateUniqueId(),
                    title: formData.title,
                    user_id: formData.user_id,
                    related_to: formData.related_to,
                    start: formData.start,
                    end: formData.end,
                    notes: formData.notes,
                };

                // Update the timecards array
                updateTimecardsArray(newUserTimecard);

                // Send POST request to update the DB (dummy function for now)
                sendPOSTRequest(newUserTimecard);

                // Add the new timecard to the calendar
                calendar.addEvent(newUserTimecard);
            } else {
                Swal.showValidationMessage('End time must be after start time');
            }
        } else {
            Swal.showValidationMessage('All fields are required');
        }
    });
}

async function fetchAndInitializeCalendar() {
    try {
        const response = await fetch('./data/time_card_details.json');
        const data = await response.json();
        timecards = transformToTimecards(data);

        const users = await fetch('./data/users.json');
        const userData = await users.json();
        usersArray = userData.platform.record;

        initializeFullCalendar(timecards);

    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }
}

function formatDatetimeForInput(dateTimeString) {
    const date = new Date(dateTimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatTime(timeString) {
    const [hourMinute, ampm] = timeString.split(' ');

    let [hour, minute] = hourMinute.split(':');
    if (ampm === 'pm' && hour !== '12') {
        hour = String(Number(hour) + 12);
    } else if (ampm === 'am' && hour === '12') {
        hour = '00';
    }

    hour = hour.padStart(2, '0');
    return `${hour}:${minute}:00`;
}

function generateUniqueId() {
    const randomId = Math.floor(Math.random() * 1000000);
    return randomId.toString();
}

function getUserProperties(userId) {
    return userMapping[userId] || { bgColor: '#4073ff', textColor: '#000000', userName: 'Unknown' };
}

///////////////////////////////

///////////////////////////////

function handleTimecardClick(info) {
    const event = info.event;
    const id = event.id;
    const title = event.title;
    const userId = event.extendedProps.userId;
    const relatedTo = event.extendedProps.related_to;
    const startTime = formatDatetimeForInput(event.start);
    const endTime = formatDatetimeForInput(event.end);
    const notes = event.extendedProps.notes;

    clickedTimecard = event.id; //global variable

    console.log(`Timecard clicked:
                ${event.id}
                ${event.title}
                ${relatedTo}
                ${userId}
                ${event.start}
                ${event.end}
                ${notes}
     `);

    showTimecardForm('Edit Timecard', id, startTime, endTime, title, notes, relatedTo, (formData) => {
        const updatedTimecard = {
            id: event.id,
            title: formData.title,
            start: new Date(formData.start),
            end: new Date(formData.end),
            notes: formData.notes,  // Updated to use formData
            related_to: formData.related_to,  // Updated to use formData
            userId: formData.userId,
        };

        updateTimecardsArray(updatedTimecard);

        const calendarTimecard = calendar.getEventById(event.id);
        if (calendarTimecard) {
            calendarTimecard.setProp('title', formData.title);
            calendarTimecard.setStart(updatedTimecard.start);
            calendarTimecard.setEnd(updatedTimecard.end);
            calendarTimecard.setExtendedProp('notes', updatedTimecard.notes);
            calendarTimecard.setExtendedProp('related', updatedTimecard.related_to);
            calendarTimecard.setExtendedProp('related', updatedTimecard.userId);
        }
    });
}

function handleTimeCardDelete(id) {
    Swal.fire({
        title: 'Delete Timecard',
        text: 'Are you sure you want to delete this event?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
    }).then((result) => {
        if (result.isConfirmed) {
            const eventIndex = timecards.findIndex(e => e.id === clickedTimecard);
            if (eventIndex !== -1) {
                timecards.splice(eventIndex, 1);
                const calendarTimecard = calendar.getEventById(id);
                if (calendarTimecard) {
                    calendarTimecard.remove();
                    sendDELETERequest(id)
                }
            } else {
                console.log('Timecard not found in timecards array');
            }
        }
    });
}

function handleTimecardResize(info) {
    console.log('Timecard resized:', info);
    const eventId = info.event.id;
    const updatedTimecard = {
        id: eventId,
        start: info.event.start,
        end: info.event.end,
        notes: info.event.extendedProps.notes,
        related_to: info.event.extendedProps.related_to
    };
    updateTimecardsArray(updatedTimecard);
    sendPUTRequest(updatedTimecard);
}

function handleTimecardDrop(info) {
    //console.log('Timecard dropped:', info);
    const eventId = info.event.id;
    const updatedTimecard = {
        id: eventId,
        start: info.event.start,
        end: info.event.end
    };
    updateTimecardsArray(updatedTimecard);
    sendPUTRequest(updatedTimecard);
}

function handleTimeRangeSelection(info) {
    const selectedStartTime = info.start;
    const selectedEndTime = info.end;
    addUserTimecard(selectedStartTime, selectedEndTime, 'myNameHere');
}

// Function to initialize the Full Calendar
function initializeFullCalendar(timecards) {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        editable: true,
        eventBackgroundColor: 'eventColor',
        eventClick: handleTimecardClick,
        eventDrop: handleTimecardDrop,
        eventResize: handleTimecardResize,
        events: timecards,
        eventTextColor: 'eventTextColor',
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth'
        },
        initialView: 'timeGridWeek',
        select: handleTimeRangeSelection,
        selectable: true,
        slotMinTime: '04:00:00'
    })

    calendar.render();
}

// Function to send a dummy DELETE request to update the DB
async function sendDELETERequest(timecardId) {
    try {
        const url = `https://net-av.agileappscloud.com/networking/rest/record/time_card_details/${timecardId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Success:', data);
        } else {
            console.log('Failed:', response.status);
        }
    } catch (error) {
        console.error('***An error occurred while sending DELETE request:', error.message);
        alert('Testing development -  sending DELETE request');
    }
}

// Function to send a dummy POST request to update the DB
async function sendPOSTRequest(newTimecard) {
    try {
        const url = `https://net-av.agileappscloud.com/networking/rest/record/time_card_details/${newTimecard.id}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newTimecard)
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Success:', data);
        } else {
            console.log('Failed:', response.status);
        }
    } catch (error) {
        console.error('***An error occurred while sending POST request:', error.message);
        alert('Testing development - sending POST request');
    }
}

// Call the function to send the PUT request
async function sendPUTRequest(updatedTimecard) {
    try {
        const url = `https://net-av.agileappscloud.com/networking/rest/record/time_card_details/${updatedTimecard.id}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedTimecard)
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Success:', data);
        } else {
            console.log('Failed:', response.status);
        }
    } catch (error) {
        console.error('***An error occurred while sending PUT request:', error.message);
        alert('Testing development - sending PUT request');
    }
};

// Function show the Swal form when clicked to add a new record
function showAddTimecardForm(title, startValue, endValue, onFormSubmit) {
    Swal.fire({
        title: title,
        html: `
        <style>
        .custom-form {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 5px;
            align-items: center;
        }
        .form-row label {
            text-align: right;
        }
        .swal2-input {
            font-family: inherit;
            font-size: inherit;
            margin: 0;
        }
        #eventStart, #eventEnd {
            color: dodgerblue;
        }
    </style>
    <form class="custom-form">
        <label for="eventCreatedBy">Owner:</label>
        <input type="text" id="eventCreatedBy" value="" placeholder = "your name" class="swal2-input">
        <label for="eventRelatedTo">Related To:</label>
        <input type="text" id="eventRelatedTo" value="" placeholder = "select from dropdown" class="swal2-input">
        <label for="eventStart">Start:</label>
        <input type="datetime-local" id="eventStart" value="${startValue}" class="swal2-input">
        <label for="eventEnd">End:</label>
        <input type="datetime-local" id="eventEnd" value="${endValue}" class="swal2-input">
        <label for="eventNotes">Notes:</label>
        <textarea id="eventNotes" class="swal2-textarea" placeholder="enter notes 15 characters"></textarea>
    </form>
        `,
        showCancelButton: true,
        confirmButtonText: 'Save',
        showLoaderOnConfirm: true,
        preConfirm: () => {
            const newTitle = Swal.getPopup().querySelector('#eventCreatedBy').value + '-' + Swal.getPopup().querySelector('#eventRelatedTo').value;
            const newRelatedTo = Swal.getPopup().querySelector('#eventRelatedTo').value;
            const newStart = new Date(Swal.getPopup().querySelector('#eventStart').value);
            const newEnd = new Date(Swal.getPopup().querySelector('#eventEnd').value);
            const newNotes = Swal.getPopup().querySelector('#eventNotes').value;

            onFormSubmit({
                title: newTitle,
                start: newStart,
                related_to: newRelatedTo,
                end: newEnd,
                notes: newNotes,
            });
        }
    });
}

// Function show the Swal form when clicked to edit or delete the record
function showTimecardForm(title, id, startValue, endValue, createdByValue, notes, related_to, onFormSubmit) {

    const userOptions = usersArray.map(user => {
        return `<option value="${user.id}">${user.first_name} ${user.last_name}</option>`;
    }).join('');

    const userDropdown = `
        <label for="userId">User:</label>
        <select id="userId" class="swal2-input">
          ${userOptions}
        </select>
      `;

    Swal.fire({
        title: title,
        html: `<style>
        .custom-form {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 5px;
            align-items: center;
        }
        .form-row label {
            text-align: right;
        }
        .swal2-input {
            font-family: inherit;
            font-size: inherit;
            margin: 0;
        }
        #eventStart, #eventEnd {
            color: dodgerblue;
        }
    </style>
    <form class="custom-form">
        <label for="eventCreatedBy">Owner:</label>
        <input type="text" id="eventCreatedBy" value="${createdByValue}" class="swal2-input">
        ${userDropdown}
        <label for="eventRelatedTo">Related To:</label>
        <input type="text" id="eventRelatedTo" value="${related_to}" class="swal2-input">
        <label for="eventStart">Start:</label>
        <input type="datetime-local" id="eventStart" value="${startValue}" class="swal2-input">
        <label for="eventEnd">End:</label>
        <input type="datetime-local" id="eventEnd" value="${endValue}" class="swal2-input">
        <label for="eventNotes">Notes:</label>
        <textarea id="eventNotes" class="swal2-textarea">${notes}</textarea>
    </form>
    
   `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Save',
        denyButtonText: 'Delete',
        showLoaderOnConfirm: true,
        preConfirm: () => {
            const newTitle = Swal.getPopup().querySelector('#eventCreatedBy').value;
            const newUserId = Swal.getPopup().querySelector('#userId').value;
            const newRelatedTo = Swal.getPopup().querySelector('#eventRelatedTo').value;
            const newStart = new Date(Swal.getPopup().querySelector('#eventStart').value);
            const newEnd = new Date(Swal.getPopup().querySelector('#eventEnd').value);
            const newNotes = Swal.getPopup().querySelector('#eventNotes').value;

            onFormSubmit({
                title: newTitle,
                userId: newUserId,
                related_to: newRelatedTo,
                start: newStart,
                end: newEnd,
                notes: newNotes,
            });
        },
        customClass: {
            input: 'swal2-input-text',
            confirmButton: 'swal2-confirm-button',
            denyButton: 'swal2-deny-button',
        }
    }).then((result) => {
        if (result.isDenied) {
            handleTimeCardDelete(id);
        }
    });
}

function transformToTimecards(jsonData) {
    let records = Array.isArray(jsonData.platform.record) ? jsonData.platform.record : [jsonData.platform.record];

    return records.map(record => {
        const userId = record.created_id?.content;
        const createdByValue = record.created_id?.displayValue;
        const relatedTo = record.mutliobjectlookup?.displayValue;
        const title = `${createdByValue}-${relatedTo}`;
        const userSettings = userColorMapping[userId] || { bgColor: '#4073ff', textColor: '#000000', userName: 'Unknown' };

        return {
            id: record.id,
            title: title,
            start: record.start_date_time,
            end: record.end_date_time,
            notes: record.notes,
            related_to: record.mutliobjectlookup.displayValue,
            backgroundColor: userSettings.bgColor,
            textColor: userSettings.textColor,
            userName: userSettings.userName
        };
    });
}

function updateTimecardsArray(updatedTimecard) {
    console.log(updatedTimecard);
    updatedTimecard.start = updatedTimecard.start.toISOString();
    updatedTimecard.end = updatedTimecard.end.toISOString();

    const eventIndex = timecards.findIndex(event => event.id === updatedTimecard.id);
    if (eventIndex !== -1) {
        timecards[eventIndex] = updatedTimecard;
    } else {
        timecards.push(updatedTimecard);
    }
}

//#endregion Event Handlers

/**********************************
 * add error checking on forms
 * put the function arguments in order or in an object
 * vite or other roll up version of the code for single bundle
 * move all the data into an object to make it more usable as an object instead of desrtucturing it into variables
 * fix the mutliobjectlookup normal name like related_to
 * incorporate the user Event Mapping into the User DB insideof AAP and set it up from there instead of hard coded
 * ********************************/

