//#region decalrations

var calendar; // FullCalendar instance  
let events = []; // Array to store the events
let nextEventId = 1;
var clickedEvent = {}

const colorMapping = {
    '1e5bb44ec77845c69a10d01df47d3f25': '#b8255f', //nathan
    '212a4d7d6f724ca9a4bb881769e5d47d': '#280353', //daniel
    '06c836a659904b9c8b0419682f7d4728': '#6accbc', //ron
    'd8191d0baac14244a11ff87470122b6d': '#14aaf6', //tyler

}
const textColorMapping = {
    '1e5bb44ec77845c69a10d01df47d3f25': '#ffffff', //nathan
    '212a4d7d6f724ca9a4bb881769e5d47d': '#ffffff', //daniel
    '06c836a659904b9c8b0419682f7d4728': '#000000', //ron
    'd8191d0baac14244a11ff87470122b6d': '#ffffff', //tyler

}
//#endregion declarations

//#region Utility functions
// Callback function for adding a user-created event
function addUserEvent(startTime, endTime, title, notes, related_to) {
    showEventForm('Add Timecard', startTime.toISOString(), endTime.toISOString(), title, notes, related_to, (result) => {
        // Extract values from Swal
        const eventTitle = Swal.getPopup().querySelector('#eventTitle').value;
        const swalStartTime = new Date(Swal.getPopup().querySelector('#eventStart').value);
        const swalEndTime = new Date(Swal.getPopup().querySelector('#eventEnd').value);

        // Extract time from original start and end times
        const [startHour, startMin, startSec] = [startTime.getUTCHours(), startTime.getUTCMinutes(), startTime.getUTCSeconds()];
        const [endHour, endMin, endSec] = [endTime.getUTCHours(), endTime.getUTCMinutes(), endTime.getUTCSeconds()];

        // Manually set the time components to the Swal date objects
        swalStartTime.setUTCHours(startHour, startMin, startSec);
        swalEndTime.setUTCHours(endHour, endMin, endSec);

        // Validate input and add the event
        if (eventTitle && swalStartTime && swalEndTime) {
            const isValid = swalStartTime < swalEndTime;
            if (isValid) {
                const newUserEvent = {
                    id: generateUniqueId(),
                    title: eventTitle,
                    start: swalStartTime,
                    end: swalEndTime
                };
                updateEventsArray(newUserEvent);
                calendar.addEvent(newUserEvent);
            } else {
                Swal.showValidationMessage('End time must be after start time');
            }
        } else {
            Swal.showValidationMessage('All fields are required');
        }
    });
}

// Function to fetch the JSON data and initialize the calendar
async function fetchAndInitializeCalendar() {
    try {
        // Fetch the JSON data from the file
        const response = await fetch('./data/time_card_details.json');
        const data = await response.json();

        events = transformToFullCalendarEvents(data);

        initializeFullCalendar(events);

    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }
}

// Function to format time to HH:mm:ss format
function formatTime(timeString) {
    const [hourMinute, ampm] = timeString.split(' ');

    let [hour, minute] = hourMinute.split(':');
    if (ampm === 'pm' && hour !== '12') {
        hour = String(Number(hour) + 12);
    } else if (ampm === 'am' && hour === '12') {
        hour = '00';
    }

    // Ensure hour is two digits
    hour = hour.padStart(2, '0');

    return `${hour}:${minute}:00`;
}

// Function to format a date for datetime-local input
function formatDatetimeForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function generateUniqueId() {
    const randomId = Math.floor(Math.random() * 1000000); // Generate a random number as an example
    return randomId.toString();
}

// Function to get a color based on created_id 
function getColorForUserId(userId) {
    return colorMapping[userId] || '#4073ff'; // default color
}

//Function to get a text color based on the background color
function getTextColorForUserId(userId) {
    return textColorMapping[userId] || '#000000'; // default color
}

// Callback function for handling event click
function handleEventClick(info) {
    const event = info.event;

    console.log("Full event object:", event);  // Log the entire event object

    const title = event.title;
    const notes = event.extendedProps.notes; // Correct way to access 'notes'
    const relatedTo = event.extendedProps.related_to; // Correct way to access 'related_to'

    //create a global variable to hold the event id
    clickedEvent = event.id;

    console.log(`Event clicked:
                ${event.start}
                ${event.end}
                ${event.title}
                ${notes}
                ${relatedTo}
     `);

    // Get the event's start and end datetime values formatted for datetime-local input
    const eventStartFormatted = formatDatetimeForInput(event.start);
    const eventEndFormatted = formatDatetimeForInput(event.end);

    // Display the form
    showEventForm('Edit Timecard', eventStartFormatted, eventEndFormatted, title, notes, relatedTo, (formData) => {
        // Handle form submission here
        const updatedEvent = {
            id: event.id,
            title: formData.title,
            start: new Date(formData.start),
            end: new Date(formData.end),
            notes: event.notes,
            related: event.related_to,
        };
        updateEventsArray(updatedEvent);

        // Update the event in the calendar
        const calendarEvent = calendar.getEventById(event.id);
        if (calendarEvent) {
            calendarEvent.setProp('title', formData.title);
            calendarEvent.setStart(updatedEvent.start);
            calendarEvent.setEnd(updatedEvent.end);
            calendarEvent.setExtendedProp('notes', updatedEvent.notes);
            calendarEvent.setExtendedProp('related', updatedEvent.related_to);
        }
    });
}

// Callback function for handling event deletion
// function handleDelete(event) {
//     Swal.fire({
//         title: 'Delete Event',
//         text: 'Are you sure you want to delete this event?',
//         icon: 'warning',
//         showCancelButton: true,
//         confirmButtonText: 'Delete',
//         showLoaderOnConfirm: true,
//         preConfirm: () => {
//             // You can perform the deletion logic here
//             // Update the events array and calendar accordingly
//         }
//     }).then((result) => {
//         if (result.isConfirmed) {
//             // Delete the event from the events array
//             const eventIndex = events.findIndex(e => e.id === event.id);
//             if (eventIndex !== -1) {
//                 events.splice(eventIndex, 1);
//                 updateEventsArray(events);
//                 calendar.getEventById(event.id).remove();
//             }
//         }
//     });
// }

// Callback function for handling event deletion
function handleDelete() {
    Swal.fire({
        title: 'Delete Event',
        text: 'Are you sure you want to delete this event?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
    }).then((result) => {
        if (result.isConfirmed) {
            const eventIndex = events.findIndex(e => e.id === clickedEvent);
            if (eventIndex !== -1) {
                events.splice(eventIndex, 1);
                const calendarEvent = calendar.getEventById(clickedEvent);
                if (calendarEvent) {
                    calendarEvent.remove();
                }
            } else {
                console.log('Event not found in events array');  // Debugging line
            }
        }
    });
}

// Callback function for handling event resizing
function handleEventResize(info) {
    const eventId = info.event.id;
    const updatedEvent = {
        id: eventId,
        start: info.event.start,
        end: info.event.end
    };

    updateEventsArray(updatedEvent);
}

// Callback function for handling event drop 
function handleEventDrop(info) {
    console.log('Event dropped:', info);
    const eventId = info.event.id;
    const updatedEvent = {
        id: eventId,
        start: info.event.start,
        end: info.event.end
    };

    updateEventsArray(updatedEvent);
}

// Callback function for handling time range selection
function handleTimeRangeSelection(info) {
    const selectedStartTime = info.start;
    const selectedEndTime = info.end;
    console.log('Selected time range:', selectedStartTime, selectedEndTime);
    addUserEvent(selectedStartTime, selectedEndTime, 'myNameHere');
}

// Initialize FullCalendar with events and addUserEvent callback
function initializeFullCalendar(events) {
    const calendarEl = document.getElementById('calendar'); // Replace with your calendar element ID
    calendar = new FullCalendar.Calendar(calendarEl, {
        editable: true,
        eventBackgroundColor: 'eventColor',
        eventClick: handleEventClick,
        eventDrop: handleEventDrop,
        eventResize: handleEventResize,
        events: events,
        eventTextColor: 'eventTextColor',
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth'
        },
        initialView: 'timeGridWeek',
        select: handleTimeRangeSelection,
        selectable: true,
        slotMinTime: '04:00:00'  // <-- Add this line to start the calendar at 4 AM
    })

    // Render the initialized calendar
    calendar.render();
}

// Function to show a confirmation dialog
function showConfirmationDialog(title, text) {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
    });
}

// Function to show an event form
function showEventForm(title, startValue, endValue, createdByValue, notes, related_to, onFormSubmit) {
    // Your existing code for formatDateForInput remains the same

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
        <label for="eventRelated">Related To:</label>
        <input type="text" id="eventRelated" value="${related_to}" class="swal2-input">
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
            const newStart = new Date(Swal.getPopup().querySelector('#eventStart').value);
            const newEnd = new Date(Swal.getPopup().querySelector('#eventEnd').value);
            const newNotes = Swal.getPopup().querySelector('#eventNotes').value;
            const newRelatedTo = Swal.getPopup().querySelector('#eventRelated').value;

            callback({
                title: newTitle,
                start: newStart,
                end: newEnd,
                notes: newNotes,
                related_to: newRelatedTo
            });
        },
        customClass: {
            input: 'swal2-input-text',
            confirmButton: 'swal2-confirm-button',
            denyButton: 'swal2-deny-button',
        }
    }).then((result) => {
        if (result.isDenied) {
            handleDelete(event);
        }
    });
}


// Function to transform the platform data to FullCalendar events with custom event colors
function transformToFullCalendarEvents(eventDataJson) {
    // Ensure records is an array
    let records = Array.isArray(eventDataJson.platform.record) ? eventDataJson.platform.record : [eventDataJson.platform.record];

    return records.map(record => {
        const userId = record.created_id?.content;
        const title = `${record.created_id?.displayValue}`;

        const bgColor = getColorForUserId(userId);
        const textColor = getTextColorForUserId(userId);

        return {
            id: record.id,
            title: title,
            start: record.start_date_time,
            end: record.end_date_time,
            notes: record.notes,
            related_to: record.mutliobjectlookup.displayValue,
            backgroundColor: bgColor,
            textColor: textColor

        };
    });
}

// Function to update the events array //
function updateEventsArray(updatedEvent) {
    // Ensure that start and end dates are in ISO format
    console.log('Updated event:', updatedEvent);
    updatedEvent.start = updatedEvent.start.toISOString();
    updatedEvent.end = updatedEvent.end.toISOString();

    const eventIndex = events.findIndex(event => event.id === updatedEvent.id);
    if (eventIndex !== -1) {
        events[eventIndex] = updatedEvent;
    } else {
        events.push(updatedEvent);
    }
    console.log('Updated events array:', events);
}



//#endregion Utility functions

//#region  Time Card App Todos
/****************************************************************************************

- CRUD to REST API
- modify the select to a single function instead of two
- make this a svelte app so we can pack it in a single file like we do with svelte-ts-grid
- make it TS and add the types
*********************************************************************************************/
//#endregion
