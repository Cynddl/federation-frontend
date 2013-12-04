// Global frontend
// --------------------------------------------------

'use strict';

var Backbone = Backbone || {};
var _ = _ || {};
var Handlebars = Handlebars || {};
var moment = moment || function(){};

// Handlebars helper to trim long text
Handlebars.registerHelper('trimString', function(passedString) {
	var theString = passedString.substring(0,140);
	if(theString === passedString) {
		return new Handlebars.SafeString(passedString);
	}
	else {
		return new Handlebars.SafeString(theString + '…');
	}
});

Handlebars.registerHelper('breaklines', function(text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.toString();
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new Handlebars.SafeString(text);
});

// Override Backbone.sync to support CORS requests
(function() {
	var proxiedSync = Backbone.sync;

	Backbone.sync = function(method, model, options) {
		options = options || {};

		if(!options.crossDomain) {
			options.crossDomain = true;
		}

		if (!options.xhrFields) {
			options.xhrFields = { withCredentials: true };
		}

		return proxiedSync(method, model, options);
	};
})();

Backbone.emulateHTTP = true;

// Translate default messages of Backbone-Forms
Backbone.Form.validators.errMessages.required = 'Ce champ est obligatoire';
Backbone.Form.validators.errMessages.match = 'Vous devez entrer la même valeur que {{field}}';
Backbone.Form.validators.errMessages.email = 'Merci d\'utiliser une adresse mail valide.';

// Base URL for the backend API
// var urlBase = 'http://fede-ensl.herokuapp.com/api';
var urlBase = 'http://fede-ensl.herokuapp.com/api';

var echelonsBourse = _.map(_.range(0, 6), function(n) { return 'Échelon ' + n; });


Handlebars.registerHelper('equal', function(lvalue, rvalue, options) {
	if (arguments.length < 3) {
		throw new Error('Handlebars Helper equal needs 2 parameters');
	}
	if( lvalue !== rvalue ) {
		return options.inverse(this);
	} else {
		return options.fn(this);
	}
});


// Models
// --------------------------------------------------

window.Event = Backbone.Model.extend({
	dateRange: function(){
		var date1 = this.get('datetime_first');
		var date2 = this.get('datetime_last');
		var date1Str = date1.minutes() === 0 ? date1.format('HH[h]') : date1.format('HH[h]mm');
		var date2Str = date2.minutes() === 0 ? date2.format('HH[h]') : date2.format('HH[h]mm');
		if(date1Str === date2Str){
			return date1Str;
		} else {
			return date1Str + ' – ' + date2Str;
		}
	},

	toJSON: function(){
		var json = Backbone.Model.prototype.toJSON.apply(this, arguments);
		json.date_range = this.dateRange();
		return json;
	},

	parse: function(data) {
		data.datetime_first = moment(data.datetime_first);
		data.datetime_last  = moment(data.datetime_last);
		return data;
	}
});

window.CSEDemande = Backbone.Model.extend({
	url: urlBase + '/cse/demande',

	schema: {
		nom:       { type: 'Text', title:'Nom', validators: ['required'] },
		prenom:    { type:'Text', title: 'Prénom', validators: ['required'] },
		email:     { validators: ['required', 'email'] },

		status:          { type: 'Select', options: ['Auditeur', 'Normalien'], validators: ['required'] },
		annee_entree:    { title: 'Année d\'entrée', type: 'Select', options: ['2013/2014', '2012/2013', '2011/2012', '2010/2011', '2009/2010'], validators: ['required'] },

		boursier:         { type: 'Select', options: ['Non'].concat(echelonsBourse), validators: ['required'] },
		boursier_montant: { title: 'Si boursier, montant :', type: 'Number' },

		logement_gracieux: {
			title: 'Êtes-vous logé à titre gratuit (résidence parentale par exemple) :',
			type: 'Select',
			options:['Non', 'Oui'],
			validators: ['required']
		},
		logement_montant: {
			title: 'Si non, quel est le montant de votre loyer mensuel individuel toutes charges comprises :',
			type:  'Number'
		},

		apl: {
			title: 'Souscrivez-vous à la Caisse d’allocation familiale (APL) :',
			type: 'Select',
			options:['Non', 'Oui'],
			validators: ['required']
		},
		apl_montant: {type: 'Number', title: ' Si oui, quel est le montant de votre aide au logement mensuelle :' },

		financement_famille: {
			title: "Obtenez-vous régulièrement de l’argent de la part de vos parents (Si certaines dépenses sont directement payées par votre/vos parent(s) sans passer par une forme de revenu mensuel de leur part (par exemple s'il(s) paye(nt) directement le loyer sans passer par vous), n'oubliez pas d'inclure ce(s) montant(s) dans cette catégorie.) ",
			type: 'Select',
			options:['Non', 'Oui'],
			validators: ['required']
		},
		financement_famille_montant: {
			type: 'Number',
			title: 'Si oui, quelles sont vos rentrées d’argent mensuelles moyennes de leur part :'
		},

		financement_autre: {
			type: 'Select',
			options:['Non', 'Oui'],
			title: "Obtenez-vous régulièrement de l’argent provenant d’une autre source (cours particuliers,travail extra-scolaire, etc...) :",
			validators: ['required']
		},
		financement_autre_source: {
			title: 'Source des revenus',
			type: 'Text'
		},
		financement_autre_montant: {
			title: 'Montant mensuel moyen',
			type: 'Number'
		},

		commentaires: 'TextArea'
	}
});


// Collections
// --------------------------------------------------

window.EventsCollection = Backbone.Collection.extend({
	model: Event,

	sync: function(method, model, options) {
		var params = _.extend({
			type: 'GET',
			dataType: 'jsonp',
			url: urlBase + '/events/' + this.method,
			processData: false
		}, options);
		return $.ajax(params);
	},

	comparator: function(ev){
		return ev.get('datetime_first');
	}
});


// Views
// --------------------------------------------------

window.EventsCollectionView = Backbone.View.extend({
	formatDate: '',
	method: 'week',

	render: function() {
		var formatedCollection = this.collection.groupBy(function(ev){
			return ev.get('datetime_first').format('dddd DD MMMM');
		});

		_.each(formatedCollection, function(evList, key){
			formatedCollection[key] = _.invoke(evList, 'toJSON');
		});

		var html = this.template({
			events: formatedCollection,
			eventsCount: _.size(this.collection),
			method: this.method,
			formatDate: this.formatDate,
			prev: this.prev,
			next: this.next
		});
		$(this.el).html(html);

		return this;
	},

	events: {
		'click article': 'popup',
	},

	popup: function(ev){
		console.log('popup !');
		ev.preventDefault();
		var modalId = $(ev.currentTarget).data('modal');
		$('#' + modalId).toggleClass('md-show');
		$('body').toggleClass('overflow');

		$('.md-overlay, #' + modalId + ' .md-close').click(function(){
			$('#' + modalId).removeClass('md-show');
			$('body').removeClass('overflow');
		});
	},

	initialize: function(){
		this.template = Handlebars.templates.events;

		this._collection = new EventsCollection();
		//this._collection.fetch();

		this._weekCollection = new Backbone.CollectionSubset({
			parent: this._collection,
			filter: function (ev, options) {
				options = options || {};
				var week = options.week || moment().week();
				var year = options.year || moment().year();

				week = week || moment().week();
				year = year || moment().year();
				return ev.get('datetime_first').week() === week && ev.get('datetime_first').year() === year;
			}
		});

		this._monthCollection = new Backbone.CollectionSubset({
			parent: this._collection,
			/*month: moment().week(),
			year: moment().year(),*/
			filter: function (ev) {
				return ev.get('datetime_first').month() === moment().month() && ev.get('datetime_first').year() === moment().year();
			}
		});

		this.collection = this._collection;
		this._collection.on('add', this.render, this);
	},

	switchCollection: function(method, options) {
		var month = options.month || moment().month();
		var year = options.year || moment().year();
		var week = options.week || moment().week();

		if(method === 'week') {
			this.collection	= this._weekCollection.child;
			this._weekCollection.setFilter(function(ev){
				return ev.get('datetime_first').week() === week && ev.get('datetime_first').year() === year;
			});
			this._weekCollection.refresh();
		} else if(method === 'month') {
			this.collection = this._monthCollection.child;
			this._monthCollection.setFilter(function(ev){
				return ev.get('datetime_first').month() === month && ev.get('datetime_first').year() === year;
			});
			this._monthCollection.refresh();
		} else {
			this.collection = this._collection;
		}
		this.render();
	}
});

window.CSEView = Backbone.View.extend({
	initialize: function(options){
		this.template = Handlebars.templates.cse;
	},

	render: function(){
		$(this.el).html(this.template());
		return this;
	}
});

window.CSEDemandeView = Backbone.View.extend({
	initialize: function(options){
		this.template = Handlebars.templates['cse-demande'];

		this.form = new Backbone.Form({
			template: Handlebars.templates['cse-form'],
			model: new CSEDemande()
		}).render();
	},

	events: {
		'submit #cse-form': 'sendForm'
	},

	sendForm: function(event){
		event.preventDefault();
		var errors = this.form.validate({ validate: true });
		if(_.size(errors) === 0) {
			$.support.cors = true;
			var settings = {
				url: urlBase + '/cse/demande',
				type: 'POST',
				contentType: 'text/plain',
				dataType: 'json',
				crossDomain: true,
				data: this.form.getValue(),
				success: function(data){
					if(data.result === 'saved') {
						$('#cse-form').html('<p>Votre demande de subvention a bien été prise en compte. Une réponse vous sera adressé par courriel.</p>');
					}
				},
				error: function(data){
					alert('Une erreur est survenue. Merci de contacter cse.federation@ens-lyon.fr pour constituer votre demande.');
				}
			};

			$.ajax(settings);
		}
	},

	render: function(){
		var html = this.template();
		$(this.el).html(html);
		$(this.el).find('#demande-form').replaceWith( this.form.el );
		return this;
	}
});

window.EventsYearView = Backbone.View.extend({
	initialize: function(){
		this.template = Handlebars.templates['events-year'];
	},

	render: function(){
		$(this.el).html(this.template());
		return this;
	}
});

window.AssociationsView = Backbone.View.extend({
	initialize: function(){
		this.template = Handlebars.templates.associations;
	},

	render: function(){
		$(this.el).html(this.template());
		return this;
	}
});

window.FederationView = Backbone.View.extend({
	initialize: function(){
		this.template = Handlebars.templates.federation;
	},

	render: function(){
		$(this.el).html(this.template());
		return this;
	}
});


// Routers
// --------------------------------------------------

window.ApplicationRouter = Backbone.Router.extend({
	initialize: function(el) {
		this.el = el;

		// Piwik
		window._paq = window._paq || [];
		return this.bind('all', this._trackPageview);
	},

	_trackPageview: function() {
		var url = Backbone.history.getFragment();
		window._paq.push(['trackPageView', '/' + url]);
	},


	loadView : function(view) {
		this.view && this.view.remove();
		this.view = view;
		this.view.render();
		this.el.html(this.view.render().$el);
	},

	view: null,

	routes: {
		'': 'index',
		'events/:cat(/:year)(/:month)(/:day)': 'events',
		'cse': 'showCSE',
		'cse/demande': 'showCSEDemande',
		'associations': 'showAssociations',
		'federation': 'showFederation'
	},

	index: function() {
		this.events('semaine');
	},

	events: function(category, year, month, day) {
		if (category === 'année') {
			this.loadView(new window.EventsYearView());
		} else if (category === 'mois') {
			this.loadView(new window.EventsCollectionView());
			console.log(this.view);

			year = parseInt(year) || moment().year();
			// Months are starting at 0.
			month = (parseInt(month) || moment().month() + 1) - 1;
			var date = moment([year, month]);

			this.view.formatDate = 'en ' + date.format('MMMM');
			this.view._collection.method = 'month/' + date.format('YYYY/MM');
			this.view._collection.fetch({remove: false});

			this.view.prev = '#events/mois/' + moment(date).add('months', -1).format('YYYY/MM');
			this.view.next = '#events/mois/' + moment(date).add('months', 1).format('YYYY/MM');
			this.view.method = 'month';

			this.view.switchCollection('month', {year: date.year(), month: date.month()});
		} else {
			this.loadView(new window.EventsCollectionView());

			year = parseInt(year) || moment().year();
			month = parseInt(month) - 1 || moment().month();
			day = parseInt(day) || moment().date();
			var date = moment([year, month, day]);
			var week1 = moment(date).startOf('week');
			var week2 = moment(date).endOf('week');

			if (week1.month() === week2.month()) {
				this.view.formatDate = 'du ' + week1.format('D') + ' au ' + week2.format('D') + ' ' + week1.format('MMMM');
			} else {
				this.view.formatDate = 'du ' + week1.format('D MMMM') + ' au ' + week2.format('D MMMM');
			}
			this.view.method = 'week';

			this.view.prev = '#events/semaine/' + moment(week1).add('w', -1).format('YYYY/MM/DD');
			this.view.next = '#events/semaine/' + moment(week1).add('w', 1).format('YYYY/MM/DD');

			this.view._collection.method = 'week/' + date.format('YYYY/w');
			this.view._collection.fetch({remove: false});

			this.view.switchCollection('week', {year: date.year(), month: date.month(), week: date.week()});
		}
	},

	showCSE: function() {
		this.loadView(new CSEView());
	},

	showCSEDemande: function() {
		this.loadView(new CSEDemandeView());
	},

	showAssociations: function() {
		this.loadView(new AssociationsView());
	},

	showFederation: function() {
		this.loadView(new FederationView());
	},
});


// Init app
// --------------------------------------------------

$(document).ready(function () {
	window.router = new ApplicationRouter($('#content'));
	Backbone.history.start({pushState: true});

	$(document).on('click', 'a:not([data-bypass])', function (evt) {
		var href = $(this).attr('href');
		var protocol = this.protocol + '//';

		if (href.slice(0, protocol.length) !== protocol) {
			evt.preventDefault();
			window.router.navigate(href, true);
		}
	});

	$('#current_month').html('En ' + moment().format('MMMM'));
});