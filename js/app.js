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

    addUserEvent(selectedStartTime, selectedEndTime);
}

// Callback function for handling event click
function handleEventClick(info) {
    const eventId = info.event.id;
    const event = events.find(event => event.id === eventId);

    if (event) {
        console.log('Clicked event data:', event);
        // Display event details in a modal or some other way
    }
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
        eventClick: handleEventClick
    });

    // Render the initialized calendar
    calendar.render();
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
