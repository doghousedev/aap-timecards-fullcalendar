//#region decalrations

var calendar; // FullCalendar instance  
let events = []; // Array to store the events
let nextEventId = 1;

//#endregion decalrations

//#region Main Entry Point
async function fetchAndInitializeCalendar() {
    try {
        // Fetch the JSON data from the file
        const response = await fetch('./data/time_card_details.json');
        const data = await response.json();
        const platformData = data.platform;

        // Transform the data
        events = transformToFullCalendarEvents(platformData);

        // Initialize FullCalendar with the events and addUserEvent callback
        initializeFullCalendar(events);

    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }
}
//#endregion Main Entry Point

//#region Utility functions
// Callback function for adding a user-created event
function addUserEvent(startTime, endTime) {
    const newUserEvent = {
        id: generateUniqueId(),
        title: 'User Event',
        start: startTime,
        end: endTime
    };
    updateEventsArray(newUserEvent);
    calendar.addEvent(newUserEvent);
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

function generateUniqueId() {
    const randomId = Math.floor(Math.random() * 1000000); // Generate a random number as an example
    return randomId.toString();
}

// Callback function for handling event deletion
function handleDelete(event) {
    Swal.fire({
        title: 'Delete Event',
        text: 'Are you sure you want to delete this event?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        showLoaderOnConfirm: true,
        preConfirm: () => {
            // You can perform the deletion logic here
            // Update the events array and calendar accordingly
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Delete the event from the events array
            const eventIndex = events.findIndex(e => e.id === event.id);
            if (eventIndex !== -1) {
                events.splice(eventIndex, 1);
                updateEventsArray(events);
                calendar.getEventById(event.id).remove();
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

    showConfirmationDialog('Add Event', 'Do you want to add an event for the selected time range?')
        .then((result) => {
            if (result.isConfirmed) {
                addUserEvent(selectedStartTime, selectedEndTime);
            }
        });
}

// Callback function for handling event click
// Function to show a modal form for editing an event
function handleEventClick(event) {
    const eventStartISO = event.start.toISOString().split('T')[0];
    const eventEndISO = event.end.toISOString().split('T')[0];

    Swal.fire({
        title: 'Edit Event',
        html: `
        <input type="text" id="eventTitle" value="${event.title}" class="swal2-input" placeholder="Event title">
        <label for="eventStart">Event start:</label>
        <input type="date" id="eventStart" value="${eventStartISO}" class="swal2-input">
        <label for="eventEnd">Event end:</label>
        <input type="date" id="eventEnd" value="${eventEndISO}" class="swal2-input">
      `,
        showCancelButton: true,
        showDenyButton: true, // Add the delete button
        confirmButtonText: 'Save',
        denyButtonText: 'Delete', // Customize the delete button text
        showLoaderOnConfirm: true,
    }).then((result) => {
        if (result.isConfirmed) {
            const newTitle = Swal.getPopup().querySelector('#eventTitle').value;
            const newStart = new Date(Swal.getPopup().querySelector('#eventStart').value);
            const newEnd = new Date(Swal.getPopup().querySelector('#eventEnd').value);

            // Update the events array
            const updatedEvent = {
                id: event.id,
                title: newTitle,
                start: newStart,
                end: newEnd
            };
            updateEventsArray(updatedEvent);

            // Update the event in the calendar
            const calendarEvent = calendar.getEventById(event.id);
            if (calendarEvent) {
                calendarEvent.setProp('title', newTitle);
                calendarEvent.setStart(newStart);
                calendarEvent.setEnd(newEnd);
            }
        } else if (result.isDenied) { // If delete button was clicked
            handleDelete(event);
        }
    });
}



// Initialize FullCalendar with events and addUserEvent callback
function initializeFullCalendar(events) {
    const calendarEl = document.getElementById('calendar'); // Replace with your calendar element ID
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        events: events,
        selectable: true,
        select: handleTimeRangeSelection,
        editable: true,
        eventDrop: handleEventDrop,
        eventResize: handleEventResize,
        eventClick: function (info) {
            const event = info.event;
            handleEventClick(event);
        }

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

// Function to transform the platform data to FullCalendar events
function transformToFullCalendarEvents(platformData) {
    const records = platformData?.record || [];
    return records.map(record => {
        const startDateTime = `${record.entry_date}T${formatTime(record.start_time?.displayValue)}`;
        const endDateTime = `${record.entry_date}T${formatTime(record.end_time?.displayValue)}`;
        const description = record.multiobjectlookup?.displayValue;
        const title = `${record.id}-${record.created_id?.displayValue}-${record.mutliobjectlookup?.displayValue}`;

        return {
            id: record.id,
            title: title,
            start: startDateTime,
            end: endDateTime
        };
    });
}

function updateEventsArray(updatedEvent) {
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

- fix drop and drag to update to the array of events correctly
- fix resize to update to the array of events correctly
- correctly parse date and time as local time not GMT
- add the delete functionality
- modal form to lookup the objects and the related info
- CRUD to REST API
- modify the select to a single function instead of two
- add the ability to add a new event from the calendar
- add the ability to add a new event from the modal form
- make this a svelte app so we can pack it in a single file like we do with svelte-ts-grid
- make it TS and add the types
*********************************************************************************************/
//#endregion
