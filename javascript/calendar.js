/******************* Local Storage **************************/
// set up local storage
var localStorage = window.localStorage;
var eventIDSTring = localStorage.getItem("nextEventID");
var nextEventID;
if (!eventIDSTring) {
	localStorage.setItem("nextEventID", JSON.stringify(0));
	nextEventID = 0;
} else {
	nextEventID = JSON.parse(eventIDSTring);
}


// grab our events
var eventsString = localStorage.getItem("events");
var events;
if (eventsString) {
	var parsedArray = JSON.parse(eventsString, function (key, value) {
		if (key == "datetime") {
			return moment(value);
		} else {
			return value;
		}
	});
	events = new Map(parsedArray);
} else {
	events = new Map();
}

// storage functions for modifying events
// save events to local storage
function saveEventList(){
	localStorage.setItem("events", JSON.stringify([...events]));
}
// increase the id stored locally so we know where to pick up next session
function incrementNextEventID(){
	nextEventID = nextEventID + 1;
	localStorage.setItem("nextEventID", JSON.stringify(nextEventID));
}
function updateEvent(event) {
	if ( event.id >= 0 ) {
		var storeEvent = {};
		storeEvent.id = event.id;
		storeEvent.datetime = event.datetime;
		storeEvent.title = event.title;
		storeEvent.description = event.description;
		events.set(event.id, storeEvent);
		saveEventList();
		return storeEvent.id;
	} else {
		// incase the event doesn't yet exist, add it.
		return addEvent(event);
	}
}
function addEvent(event){
	if (event.id < 0) {
		var storeEvent = {};
		storeEvent.id = nextEventID;
		storeEvent.datetime = event.datetime;
		storeEvent.title = event.title;
		storeEvent.description = event.description;
		events.set(nextEventID, storeEvent);
		incrementNextEventID();
		saveEventList();
		return storeEvent.id;
	} else {
		// incase the event already exists, update it instead.
		return updateEvent(event);
	}
}
function deleteEvent(event){
	if (event.id > 0) {
		events.delete(event.id);
		saveEventList();
	} else {
		// was never saved so we don't need to delete it
	}
}


/******************* Date Extensions **************************/
// For determining which weeks and days to render
// May be replaced with MomentJS
Date.prototype.daysInMonth = function(){
    var d= new Date(this.getFullYear(), this.getMonth()+1, 0);
    return d.getDate();
}
// includes partial weeks from beginning and end of month
Date.prototype.weeksInMonth = function(){
	var firstDayOfWeek = new Date(this.getFullYear(), this.getMonth(), 1).getDay();
	var offsetDays = this.daysInMonth() + firstDayOfWeek;
	return Math.ceil(offsetDays / 7) // ceil to include last partial week
}

Date.prototype.dateOfFirstDayOfFirstWeek = function(){
	var firstDayOfWeek = new Date(this.getFullYear(), this.getMonth(), 1).getDay();
	return new Date(this.getFullYear(), this.getMonth(), 1 - firstDayOfWeek);
}


/******************* Event Component **************************/
// For creating and modifying calendar events
class Event extends React.Component {
	constructor (props) {
		super(props);
		this.state = {
			datetime: props.event.datetime,
			title: props.event.title,
			description: props.event.description,
			id: props.event.id,
			datetimeString: ''
		};
		this.handleDateChange = this.handleDateChange.bind(this);
		this.handleTitleChange = this.handleTitleChange.bind(this);
		this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
		this.handleNew = this.handleNew.bind(this);
		this.handleSave = this.handleSave.bind(this);
		this.handleDelete = this.handleDelete.bind(this);
	}

	/**** Event Handlers ****/

	handleDateChange(event){
		if (typeof(event) == 'string') {
			this.setState({datetimeString: event});
		} else {
			// check if it is equivalent to current moment, so the AM can be deleted
			if (this.state.datetime.isSame(event)) {
				this.setState({datetimeString: event.toString()})
			} else {
				this.setState({datetime: event, datetimeString: ''});
			}
		}
	}

	handleTitleChange(event){
		this.setState({title: event.target.value});
	}

	handleDescriptionChange(event){
		this.setState({description: event.target.value});
	}

	handleNew(event){
		this.setState({
			datetime: moment(),
			title: '',
			description: '',
			id: -1,
			datetimeString: ''
		});
	}

	handleDelete(event){
		removeEvent({datetime: this.state.datetime, title: this.state.title, description: this.state.description, id: this.state.id});
		this.setState({
			datetime: moment(),
			title: '',
			description: '',
			id: -1,
			datetimeString: ''
		});
	}

	handleSave(event){
		if (this.state.datetimeString == '') {
			saveEvent({datetime: this.state.datetime, title: this.state.title, description: this.state.description, id: this.state.id});
		} else {
			var tryMoment = moment(this.state.datetimeString)
			if (tryMoment.isValid()) {
				saveEvent({datetime: tryMoment, title: this.state.title, description: this.state.description, id: this.state.id});
			} else {
				// invalid date?
			}
		}
	}

	/***** rendering view *****/
	render() {
		var dateError;
		if (this.state.datetimeString != '' && !moment(this.state.datetimeString).isValid()) {
			dateError = React.createElement(
				'span',
				{},
				"Date is not valid"
			)
		} else {
			dateError = dateError = React.createElement(
				'span',
				{},
				null
			)
		}

		return React.createElement(
			'div', 
			{}, 
			React.createElement(
				'div', 
				{className: 'eventAttribute title'}, 
				"Selected Event",
				React.createElement(
					'button',
					{className: 'deleteButton', onClick: this.handleDelete},
					'DELETE'
				)				
			),
			React.createElement( // Datetime
				'div', {className: 
				'eventAttribute'}, 
				React.createElement(
					'label', 
					{}, 
					"Date: ",
					dateError,
					React.createElement(
						Datetime,
						{onChange: this.handleDateChange, value: this.state.datetime, input: true}
					)
				)
			),
			React.createElement( // Title
				'div', 
				{className: 'eventAttribute'}, 
				React.createElement(
					'label', 
					{}, 
					"Title: ",
					React.createElement(
						'input',
						{type: 'text', onChange: this.handleTitleChange, value: this.state.title}
					)
				)
			),
			React.createElement( // Description
				'div', 
				{className: 'eventAttribute'}, 
				React.createElement(
					'label', 
					{}, 
					"Description: ",
					React.createElement(
						'textarea',
						{onChange: this.handleDescriptionChange, value: this.state.description}
					)
				)
			),
			React.createElement( // Buttons
				'div', 
				{className: 'eventAttribute'}, 
				React.createElement(
					'button', 
					{className: 'newButton', onClick: this.handleNew}, 
					"New"
				),
				React.createElement(
					'button', 
					{className: 'saveButton', onClick: this.handleSave}, 
					"Save"
				)
			)
		);
	}
}
// add the component to our page
var eventElement = ReactDOM.render(
	React.createElement(Event, {event: {datetime: moment(), title: '', description: '', id: -1}}, null), 
	document.getElementById('event')
);

/******************* Calendar Component **************************/

// helper to render week titles above the calendar
function renderTitle(title){
	return React.createElement(
		'span',
		{className: 'title dayCol weekdayTitle'},
		title
	)
}

// helper to render a single event to the calendar
function renderCalendarEvent(event) {
	return React.createElement(
		'div',
		{className: 'event', onClick: selectEvent(event)}, 
		event.datetime.format('h:mm A') + ' | ' + event.title
	)
}

// helper to render a day and its events
function renderDay(date, isCurrentMonth, events) {
	var today = moment();
	var eventListElements = new Array();
	var sortedEvents = events.sort(function (a,b){
		return a.datetime < b.datetime;
	});
	for (var i = sortedEvents.length - 1; i >= 0; i--) {
		eventListElements.push(renderCalendarEvent(sortedEvents[i]));
	}
	var classes = 'dayCol day';
	if (!isCurrentMonth) {
		classes = classes + ' otherMonthDay';
	}
	if (date.day() == 0 || date.day() == 6){
		classes = classes + ' weekend';
	}
	if (date.year() == today.year() && date.month() == today.month() && date.date() == today.date()) {
		classes = classes + ' today';
	}
	return React.createElement(
		'div',
		{className: classes},
		React.createElement(
			'span',
			{className: 'dayNumber'},
			date.date()
		),
		React.createElement(
			'div',
			{className: 'dayTitle'},
			date.format('dddd')
		),
		eventListElements
	)
}

// helper function for render a week row
// seven day week starting with whichever date is given
function renderWeek(startDate, month, events) {
	var days = new Array(7);
	for (var i = 0; i < 7; i++) {
		var today = moment().year(startDate.year()).month(startDate.month()).date(startDate.date() + i);
		// filter the events to send to each day
		var daysEvents = events.filter(function(event){
			return (event.datetime.year() == today.year() && event.datetime.month() == today.month() && event.datetime.date() == today.date());
		});
		days[i] = renderDay(
			today, 
			(month == today.month()),
			daysEvents)
	}
	return React.createElement(
		'div',
		{className: 'weekRow'},
		days
	)
}

// helper that renders a full month into the calendar
function renderMonth(year, month, events) {
	var firstDayOfMonth = new Date(year, month, 1);
	var numWeeks = firstDayOfMonth.weeksInMonth();
	var weeks = new Array(numWeeks);
	var firstDayOfWeek = firstDayOfMonth.dateOfFirstDayOfFirstWeek();
	for (var i = 0; i < numWeeks; i++) {
		weeks.push(renderWeek(
			moment().year(firstDayOfWeek.getFullYear()).month(firstDayOfWeek.getMonth()).date(firstDayOfWeek.getDate() + (i * 7)), 
			month, 
			events)
		)
	}
	return React.createElement(
		'div',
		{},
		weeks
	)
}

// Calendar component, holds state for events to display
class Calendar extends React.Component {
	constructor (props) {
		super(props);
		this.state = {events: props.events, selectedYear: props.selectedYear, selectedMonth: props.selectedMonth}

		this.handleIncrementMonth = this.handleIncrementMonth.bind(this);
		this.handleDecrementMonth = this.handleDecrementMonth.bind(this);
	}

	/**** Event Handlers ****/

	handleIncrementMonth(event){
		if (this.state.selectedMonth == 11) {
			this.setState({selectedYear: (this.state.selectedYear + 1), selectedMonth: 0});
		} else {
			this.setState({selectedMonth: (this.state.selectedMonth + 1)});
		}
	}
	handleDecrementMonth(event){
		if (this.state.selectedMonth == 0) {
			this.setState({selectedYear: (this.state.selectedYear - 1), selectedMonth: 11});
		} else {
			this.setState({selectedMonth: (this.state.selectedMonth - 1)});
		}
	}

	/**** Calendar rendering ****/

	render() {
		var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
		var dayTitles = new Array(7);
		for (var i = days.length - 1; i >= 0; i--) {
			dayTitles[i] = renderTitle(days[i]);
		}
		var monthMoment = moment().year(this.state.selectedYear).month(this.state.selectedMonth);

		return React.createElement(
			'div', 
			{className: 'calendar'}, 
			React.createElement(
				'div', 
				{className: 'calendarBar'}, 
				React.createElement( // Title and prev/next buttons
					'div',
					{className: 'monthTitle title'},
					React.createElement(
						'button',
						{className: 'prevButton', onClick: this.handleDecrementMonth},
						'Previous Month'
					),
					monthMoment.format("MMMM YYYY"),
					React.createElement(
						'button',
						{className: 'nextButton', onClick: this.handleIncrementMonth},
						'Next Month'
					)
				),
				dayTitles),
			React.createElement('div', {className: 'calendarContent'}, renderMonth( this.state.selectedYear, this.state.selectedMonth, this.state.events)) // Days part of the calendar
		)
	}
}

// add calendar to our page
var calendarElement = ReactDOM.render(
	React.createElement(Calendar, {events: Array.from(events.values()), selectedYear: 2016, selectedMonth: 10}, null),
	document.getElementById('calendar')
)

// select an event from the calendar to display and edit in the Event component
function selectEvent(calendarEvent){
	return function(clickEvent) {
		eventElement.setState({
			datetime: calendarEvent.datetime,
			title: calendarEvent.title,
			description: calendarEvent.description,
			id: calendarEvent.id
		});
	}
}

// helpers to save and remove events and update the calendar view at the same time
function removeEvent(calendarEvent){
	if (event.id != -1) {
		deleteEvent(calendarEvent);
	}
	calendarElement.setState({events: Array.from(events.values())});
}

function saveEvent(calendarEvent){
	if (calendarEvent.id == -1) {
		eventElement.setState({id: addEvent(calendarEvent)});
	} else {
		updateEvent(calendarEvent);
	}
	calendarElement.setState({events: Array.from(events.values())});
}