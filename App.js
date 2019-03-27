Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',


    _projectId: undefined,
    _mapProjects: undefined,

    _releaseId: undefined,
    _releaseName: undefined,

    _iterationId: undefined,
    _iterationName: undefined,

    _searchParameter: undefined,
    _storiesFilter: undefined,


    items:[
        {
            xtype:'container',
            itemId:'header',
            cls:'header'
        },
        {
            xtype:'container',
            itemId:'bodyContainer',
			width:'100%',
			autoScroll:true
        }
    ],


    launch: function() {
        //Write app code here

        //API Docs: https://help.rallydev.com/apps/2.1/doc/


        var context =  this.getContext();
        var project = context.getProject()['ObjectID'];
        this._projectId = project;

        console.log('Project:', this._projectId);


        this.myMask = new Ext.LoadMask({
            msg: 'Please wait...',
            target: this
        });


        var releaseComboBox = Ext.create('Rally.ui.combobox.ReleaseComboBox', {
			fieldLabel: 'Choose Release',
			width: 400,
			itemId: 'releasaeComboBox',
			allowClear: true,
			showArrows: false,
			scope: this,
			listeners: {
				ready: function(combobox) {
					var release = combobox.getRecord();

					//this._initDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
					//this._endDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
					this._releaseId = release.get('ObjectID');
					this._releaseName = combobox.getRecord().get('Name');  
				},
				select: function(combobox, records) {
					var release = records[0];

					//this._initDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
					//this._endDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
					this._releaseId = release.get('ObjectID');
					this._releaseName = combobox.getRecord().get('Name');  
				},
				scope: this
			}
		});

		var iterationComboBox = Ext.create('Rally.ui.combobox.IterationComboBox', {
			fieldLabel: 'Choose Iteration',
			width: 400,
            itemId: 'iterationComboBox',
            allowClear: true,
            showArrows: false,
            scope: this,
            listeners: {
                ready: function(combobox) {
                	var iteration = combobox.getRecord();
                	this._iterationId = iteration.get('ObjectID');
                	this._iterationName = iteration.get('Name');

                },
                select: function(combobox, records, opts) {
                    var iteration = records[0];
                	this._iterationId = iteration.get('ObjectID');
                	this._iterationName = iteration.get('Name');
                },
                scope: this
            }

        });

        var searchButton = Ext.create('Rally.ui.Button', {
        	text: 'Search',
        	margin: '10 10 10 100',
        	scope: this,
        	handler: function() {
        		//handles search
        		//console.log(initDate, endDate);
        		this._doSearch();
        		//this._loadEndData(projectId, this._releaseId, null);
        	}
        });


        this.down('#header').add([
		{
			xtype: 'panel',
			autoWidth: true,
			layout: 'hbox',

			items: [{
				xtype: 'panel',
				title: 'Filter:',
				flex: 3,
				align: 'stretch',
				autoHeight: true,
				bodyPadding: 10,
				items: [{
		            xtype      : 'radiogroup',
		            items: [
		                {
		                	xtype	  : 'radiofield',				            
		                    id        : 'radio1',
		                    name      : 'parameter',
		                    boxLabel  : 'Features',
		                    padding: '0 10 0 0',				            
		                    inputValue: 'f'
		                }, {
		                    id        : 'radio2',
		                    name      : 'parameter',
		                    boxLabel  : 'Stories',
		                    padding: '0 10 0 0',			            
		                    inputValue: 's'
		                }
		            ],
		            listeners: {
				        change: function(field, newValue, oldValue) {
				            var value = newValue.parameter;
				            this._searchParameter = value;

				            console.log('value radio:', value);

				            var storiesFilter = Ext.ComponentQuery.query('#storiesRadioFilter')[0];

				            if (value === 'f') {
				            	releaseComboBox.show();
				            	iterationComboBox.hide();
				            	storiesFilter.hide();
				            } else if (value === 's') {
				            	storiesFilter.show();
				            	Ext.ComponentQuery.query('#releaseRadio')[0].setValue('r');
				            } else {
				            	releaseComboBox.hide();
				            	iterationComboBox.hide();
				            	storiesFilter.hide();
				            }				            
				        },
				        scope: this
				    }
		        }, {
		        	xtype: 'radiogroup',
		        	id: 'storiesRadioFilter',
		            fieldLabel : 'Choose',
		        	columns: 2,
        			vertical: true,            
		            items: [
		                {
		                	boxLabel  : 'Release',
		                    id        : 'releaseRadio',
		                    name      : 'storiesFilter',
		                    padding: '0 10 0 0',			            
		                    inputValue: 'r'
		                },
		                {
		                	boxLabel  : 'Iteration',
		                    id        : 'iteartionRadio',
		                    name      : 'storiesFilter',
		                    padding: '0 10 0 0',			            
		                    inputValue: 'i'
		                }
		            ],
		            listeners: {
				        change: function(field, newValue, oldValue) {
				            var value = newValue.storiesFilter;
				            this._storiesFilter = value;

				            console.log('value radio:', value);

				            if (value === 'r') {
				            	releaseComboBox.show();
				            	iterationComboBox.hide();
				            } else if (value === 'i') {
				            	releaseComboBox.hide();
				            	iterationComboBox.show();
				            } else {
				            	releaseComboBox.hide();
				            	iterationComboBox.hide();
				            }				            
				        },
				        scope: this
				    }
		        }]
			}]
		},
		{
			xtype: 'panel',
			items: [
				releaseComboBox,
				iterationComboBox,
				searchButton
			]
		}]);

		Ext.ComponentQuery.query('#storiesRadioFilter')[0].hide();

		releaseComboBox.hide();
    	iterationComboBox.hide();
    },


    _doSearch: function() {
    	this.myMask.show();
    	
    	var types = this._getTypes();
    	var filters = this._getFilters();

        var featureStore = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: types,
            filters: filters,
            fetch: ['Name', 
            		'FormattedID',
            		'ScheduleState',
            		'Owner',
            		'Project',
            		'Predecessors',
            		'Successors'       		
			],
            limit: Infinity,
            context: {
                project: '/project/' + this._projectId, //null to search all workspace
                projectScopeUp: false,
                projectScopeDown: true,
            },
            // filters: [filter],
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }]
        });


        featureStore.load().then({
			success: function(records) {
				console.log('records', records);


				if (records && records.length > 0) {
					var artPromises = [];
					_.each(records, function(artifact) {

						var pInfo = artifact.get('Predecessors');
	                    var pCount = pInfo.Count;


	                    var sInfo = artifact.get('Successors');
	                    var sCount = sInfo.Count;


	                    if (pInfo && pCount > 0) {
	                        var pLock = Ext.create('Deft.Deferred');
	                        artPromises.push(pLock);


	                        var pPromise = this._loadPredecessors(artifact);

	                        Deft.Promise.all(pPromise).then({
	                            success: function(predecessors) {
	                                console.log('p loaded for:',pInfo);

	                                artifact.get('Predecessors')['data'] = predecessors;
	                                //console.log('tcs attached: ', tcs);

	                                pLock.resolve();
	                            },
	                            failure: function(error) {
	                                console.log('error:', error);
	                            },
	                            scope: this
	                        });
	                    }


	                    if (sInfo && sCount > 0) {
	                        var sLock = Ext.create('Deft.Deferred');
	                        artPromises.push(sLock);


	                        var sPromise = this._loadSuccessors(artifact);

	                        Deft.Promise.all(sPromise).then({
	                            success: function(successors) {
	                                console.log('s loaded for:',sInfo);

	                                artifact.get('Successors')['data'] = successors;
	                                //console.log('tcs attached: ', tcs);

	                                sLock.resolve();
	                            },
	                            failure: function(error) {
	                                console.log('error:', error);
	                            },
	                            scope: this
	                        });
	                    }

					}, this);


					Deft.Promise.all(artPromises).then({
			            success: function() {
			                console.log('all artifacts loaded with predecessors and successors');

			                this.myMask.hide();     

			                this._createGrid(records);
			            },
			            failure: function(error) {
			                console.log('error:', error);
			            },
			            scope: this
			        });
				} else {
					this.myMask.hide();
				}
			},
			scope: this
		});
    },


	_getTypes: function() {
    	var types = [];

    	if (this._searchParameter === 'f') {
    		types.push('PortfolioItem/Feature');
    	} else {
    		types.push('HierarchicalRequirement');
    	}

    	return types;
    },


    _getFilters: function() {
    	var filters;

    	if (this._searchParameter === 'f') {
        	var releaseFilter = Ext.create('Rally.data.QueryFilter', {
				property: 'Release.name',
				operator: '=',
				value: this._releaseName
			});

        	// filter = blockedFilter.and(releaseFilter);
        	filters = releaseFilter;

        } else {
        	if (this._storiesFilter === 'r') {
        		var releaseFilter = Ext.create('Rally.data.QueryFilter', {
					property: 'Release.name',
					operator: '=',
					value: this._releaseName
				});

	        	// filter = blockedFilter.and(releaseFilter);
	        	filters = releaseFilter;

        	} else {
	        	var iterationFilter = Ext.create('Rally.data.QueryFilter', {
					property: 'Iteration.Name',
	                operator: '=',
	                value: this._iterationName
				});

	        	// filter = blockedFilter.and(iterationFilter);
	        	filters = iterationFilter;
	        }
	    }

	    var dependencyFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'Predecessors.ObjectID',
			operator: '!=',
			value: 'null'
		});

	   	var finalFilter = filters.and(dependencyFilter);


    	return finalFilter;
    },


    _createGrid: function(artifacts) {
    	console.log('Creating grid with artifacts', artifacts);
    	this.down('#bodyContainer').removeAll();
    	var dataFeatures = [];

    	if (this._searchParameter === 'f') {
	    	_.each(artifacts, function(artifact) {

	    		if (artifact.get('Predecessors') && artifact.get('Predecessors').data) {
	    			_.each(artifact.get('Predecessors').data, function(predecessor) {
	    				dataFeatures.push({
			    			FormattedID: artifact.get('FormattedID') + ' - '  + artifact.get('Name'),
			    			Type: 'P',
			    			DependentFeature: predecessor.get('FormattedID') + ' - '  + predecessor.get('Name'),
			    			Release: predecessor.get('Release') ? predecessor.get('Release').Name : '',
			    			State: predecessor.get('State') ? predecessor.get('State').Name : ''
			    		});
	    			}, this);
	    		} else {
		    		dataFeatures.push({
		    			FormattedID: artifact.get('FormattedID') + ' '  + artifact.get('Name'),
		    			Type: 'P',
		    			DependentFeature: artifact.get('Predecessors').data,
		    			Release: artifact.get('Release') ? artifact.get('Release').Name : '',
		    			State: artifact.get('State')
		    		});
	    		}


	    		if (artifact.get('Successors') && artifact.get('Successors').data) {
	    			_.each(artifact.get('Successors').data, function(successor) {
	    				dataFeatures.push({
			    			FormattedID: artifact.get('FormattedID') + ' - '  + artifact.get('Name'),
			    			Type: 'S',
			    			DependentFeature: successor.get('FormattedID') + ' - '  + successor.get('Name'),
			    			Release: successor.get('Release') ? successor.get('Release').Name : '',
			    			State: successor.get('State') ? successor.get('State').Name : ''
			    		});
	    			}, this);
	    		} else {
		    		dataFeatures.push({
		    			FormattedID: artifact.get('FormattedID') + ' '  + artifact.get('Name'),
		    			Type: 'S',
		    			DependentFeature: artifact.get('Successors').data,
		    			Release: artifact.get('Release') ? artifact.get('Release').Name : '',
		    			State: artifact.get('State')
		    		});
	    		}
			}, this);
    	} else {
    		_.each(artifacts, function(artifact) {

	    		if (artifact.get('Predecessors') && artifact.get('Predecessors').data) {
	    			_.each(artifact.get('Predecessors').data, function(predecessor) {
	    				dataFeatures.push({
			    			FormattedID: artifact.get('FormattedID') + ' - '  + artifact.get('Name'),
			    			Type: 'P',
			    			DependentFeature: predecessor.get('FormattedID') + ' - '  + predecessor.get('Name'),
			    			Release: predecessor.get('Release') ? predecessor.get('Release').Name : '',
			    			Iteration: predecessor.get('Iteration') ? predecessor.get('Iteration').Name : '',
			    			State: predecessor.get('ScheduleState') ? predecessor.get('ScheduleState') : ''
			    		});
	    			}, this);
	    		} else {
		    		dataFeatures.push({
		    			FormattedID: artifact.get('FormattedID') + ' '  + artifact.get('Name'),
		    			Type: 'P',
		    			DependentFeature: artifact.get('Predecessors').data,
		    			Release: artifact.get('Release') ? artifact.get('Release').Name : '',
		    			Iteration: artifact.get('Iteration') ? artifact.get('Iteration').Name : '',
		    			State: artifact.get('ScheduleState')
		    		});
	    		}


	    		if (artifact.get('Successors') && artifact.get('Successors').data) {
	    			_.each(artifact.get('Successors').data, function(successor) {
	    				dataFeatures.push({
			    			FormattedID: artifact.get('FormattedID') + ' - '  + artifact.get('Name'),
			    			Type: 'S',
			    			DependentFeature: successor.get('FormattedID') + ' - '  + successor.get('Name'),
			    			Release: successor.get('Release') ? successor.get('Release').Name : '',
			    			Iteration: successor.get('Iteration') ? successor.get('Iteration').Name : '',
			    			State: successor.get('ScheduleState') ? successor.get('ScheduleState') : ''
			    		});
	    			}, this);
	    		} else {
		    		dataFeatures.push({
		    			FormattedID: artifact.get('FormattedID') + ' '  + artifact.get('Name'),
		    			Type: 'S',
		    			DependentFeature: artifact.get('Predecessors').data,
		    			Release: artifact.get('Release') ? artifact.get('Release').Name : '',
		    			Iteration: artifact.get('Iteration') ? artifact.get('Iteration').Name : '',
		    			State: artifact.get('ScheduleState')
		    		});
	    		}
			}, this);
    	}



    	var featureStore = Ext.create('Ext.data.JsonStore', {
			fields:['FormattedID', 'Type', 'DependentFeature', 'Release', 'Iteration', 'State'],
            data: dataFeatures
        });

    	var columns;
    	if (this._searchParameter === 'f') {
    		columns = [
                {
                    text: 'Feature #',
                    dataIndex: 'FormattedID',
                    flex: 3
                },
                {
                    text: 'Dependent P/S',
                    dataIndex: 'Type',
                    flex: 1,
                },
                {
                    text: 'Dependent Feature #', 
                    dataIndex: 'DependentFeature',
                    flex: 3,
                },
                {
                    text: 'Dependent Release',
                    dataIndex: 'Release',
                    flex: 1,
                },
                {
                    text: 'Dependent State',
                    dataIndex: 'State',
                    flex: 1,
                }
            ];
    	} else {
    		columns = [
                {
                    text: 'Story #',
                    dataIndex: 'FormattedID',
                    flex: 3
                },
                {
                    text: 'Dependent P/S',
                    dataIndex: 'Type',
                    flex: 1,
                },
                {
                    text: 'Dependent Story #', 
                    dataIndex: 'DependentFeature',
                    flex: 3,
                },
                {
                    text: 'Dependent Release',
                    dataIndex: 'Release',
                    flex: 1,
                },
                {
                    text: 'Dependent Iteration',
                    dataIndex: 'Iteration',
                    flex: 1,
                },
                {
                    text: 'Dependent State',
                    dataIndex: 'State',
                    flex: 1,
                }
            ];
    	}

        var featuresGrid = Ext.create('Ext.grid.Panel', {
    		//width: 500,
    		itemId : 'featuresGrid',
    		store: featureStore,
    		viewConfig : {
    			enableTextSelection: true
    		},

    		columns: columns
        });

        var mainPanel = Ext.create('Ext.panel.Panel', {			
			title: 'Features Dependency',
			//autoWidth: true,
			autoScroll: true,
            layout: {
				type: 'vbox',
				align: 'stretch',
				//padding: 5
			},
            padding: 5,            
            items: [
                featuresGrid                
            ]
        });

		this.down('#bodyContainer').add(mainPanel);


    },


    _loadPredecessors: function(artifact) {
        var deferred = Ext.create('Deft.Deferred');
        //console.log('loading tc for story:', story);

        artifact.getCollection('Predecessors').load({
            fetch: ['Name',
            		'FormattedID',
            		'ScheduleState',
            		'State',
            		'Project',
            		'PlanEstimate',
            		'LeafStoryPlanEstimateTotal',
            		'Release',
            		'Iteration'
            	   ],
            callback: function(records, operation, success) {
                //console.log('TestCase loaded:', records);
                deferred.resolve(records);                
            }
        });                    

        return deferred.promise;

    },


    _loadSuccessors: function(artifact) {
        var deferred = Ext.create('Deft.Deferred');
        //console.log('loading tc for story:', story);

        artifact.getCollection('Successors').load({
            fetch: ['Name',
            		'FormattedID',
            		'ScheduleState',
            		'State',
            		'Project',
            		'PlanEstimate',
            		'LeafStoryPlanEstimateTotal',
            		'Release',
            		'Iteration'
            	   ],
            callback: function(records, operation, success) {
                //console.log('TestCase loaded:', records);
                deferred.resolve(records);                
            }
        });                    

        return deferred.promise;

    }
});
