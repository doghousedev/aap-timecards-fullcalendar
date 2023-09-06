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

        console.log('Events:', events);
        // Initialize FullCalendar with the events and addUserEvent callback
        initializeFullCalendar(events);

    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }
}
//#endregion Main Entry Point

//#region Utility functions
// Callback function for adding a user-created event
function addUserEvent(startTime, endTime, title) {
    showEventForm('Add Timecard', startTime.toISOString(), endTime.toISOString(), title, (result) => {
        const eventTitle = Swal.getPopup().querySelector('#eventTitle').value;
        const eventStart = new Date(Swal.getPopup().querySelector('#eventStart').value + 'T' + startTime.toISOString().split('T')[1]);
        const eventEnd = new Date(Swal.getPopup().querySelector('#eventEnd').value + 'T' + endTime.toISOString().split('T')[1]);

        // Validate input and add the event
        if (eventTitle && eventStart && eventEnd) {
            const isValid = eventStart < eventEnd;
            if (isValid) {
                const newUserEvent = {
                    id: generateUniqueId(),
                    title: eventTitle,
                    start: eventStart,
                    end: eventEnd
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

// Function to show a modal form for editing an event
function handleEventClick(event) {
    // Get the event's start and end datetime values in ISO format
    const eventStartISO = event.start.toISOString();
    const eventEndISO = event.end.toISOString();

    showEventForm('Edit Event', eventStartISO, eventEndISO, event.title, (formData) => {
        // Handle form submission here
        const updatedEvent = {
            id: event.id,
            title: formData.title,
            start: new Date(formData.start),
            end: new Date(formData.end)
        };
        updateEventsArray(updatedEvent);

        // Update the event in the calendar
        const calendarEvent = calendar.getEventById(event.id);
        if (calendarEvent) {
            calendarEvent.setProp('title', formData.title);
            calendarEvent.setStart(updatedEvent.start);
            calendarEvent.setEnd(updatedEvent.end);
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
    console.log('Selected time range:', selectedStartTime, selectedEndTime);
    addUserEvent(selectedStartTime, selectedEndTime, 'myNameHere');
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
        },
        timeZone: 'America/New_York', // Set the time zone to 'America/New_York'

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
function showEventForm(title, startValue, endValue, titleValue, callback) {
    // Function to format a date in the required format for datetime-local input
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    startValue = formatDateForInput(new Date(startValue));
    endValue = formatDateForInput(new Date(endValue));

    Swal.fire({
        title: title,
        html: `
        <form class="custom-form">
            <div class="form-row">
                <label for="eventTitle">Title:</label>
                <input type="text" id="eventTitle" value="${titleValue}" class="swal2-input">
            </div>
            <div class="form-row">
                <label for="eventStart">Start:</label>
                <input type="datetime-local" id="eventStart" value="${startValue}" class="swal2-input">
            </div>
            <div class="form-row">
                <label for="eventEnd">End:</label>
                <input type="datetime-local" id="eventEnd" value="${endValue}" class="swal2-input">
            </div>
        </form>
      `,
        showCancelButton: true,
        showDenyButton: true, // Add the delete button
        confirmButtonText: 'Save',
        denyButtonText: 'Delete', // Customize the delete button text
        showLoaderOnConfirm: true,
        preConfirm: () => {
            const newTitle = Swal.getPopup().querySelector('#eventTitle').value;
            const newStart = new Date(Swal.getPopup().querySelector('#eventStart').value);
            const newEnd = new Date(Swal.getPopup().querySelector('#eventEnd').value);
            // You can perform validation and updating here

            // Invoke the callback with the form values
            callback({
                title: newTitle,
                start: newStart,
                end: newEnd
            });
        },
        customClass: {
            input: 'swal2-input-text',
            confirmButton: 'swal2-confirm-button',
            denyButton: 'swal2-deny-button',
        }
    }).then((result) => {
        if (result.isDenied) { // If delete button was clicked
            handleDelete(event);
        }
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

// Function to update the events array
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
