Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',


    _projectId: undefined,
    _mapProjects: undefined,

    _releaseId: undefined,
    _releaseName: undefined,

    _iterationId: undefined,
    _iterationName: undefined,

    _searchParameter: 'f',
    _storiesFilter: undefined,

    _featureStateExclude: undefined,
    _dependentFeatureStateExclude: undefined,

    _milestoneType: undefined,
    _selectedMilestones: undefined,


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


        this._milestoneComboStore = undefined;
		this._milestoneCombo = Ext.widget('rallymilestonecombobox', {
			itemId: 'milestonecombobox',
			allowClear: true,
			multiSelect: false,
			queryMode: 'local',
			width: 300,
			listeners: {
				afterrender: function(combobox) {
					combobox.disable();
				},
				beforerender: function(combo) {
					console.log('beforerender: ', combo);
					this._blockFilters();

					//console.log('store', this._milestoneComboStore);
					//this._setFilter(combo.value);
				},
				ready: function(combo) {
					console.log('ready: ', combo.value);
					this._unBlockFilters();
					combo.refreshStore();
					combo.enable();
					//console.log('store', this._milestoneComboStore);
					//this._setFilter(combo.value);
				},
				change: function(combo) {
					//console.log('change: ', combo);
					console.log('milestone change: ', combo.getValue());
					//console.log('store', this._milestoneComboStore);

					if (combo.getValue() && combo.getValue() != '' && combo.valueModels.length > 0) {
						var milestones = combo.valueModels;
						milestones.sort(
							function(a, b) {
								return a.get('TargetDate').getTime() - b.get('TargetDate').getTime();
							}
						);

						this._selectedMilestones = milestones;
					} else {
						this._selectedMilestones = [];
						this._applyMilestoneRangeFilter(this._initDate, this._endDate, this._milestoneComboStore, this);
					}
				},
				scope: this
			}
		});

		this._milestoneComboStore = this._milestoneCombo.getStore();


        var excludedStatesComboBox = { 
        	xtype: 'rallyfieldvaluecombobox',
	        fieldLabel: 'Exclude Feature States',
	        id: 'excludedStatesComboBox',
	        defaultSelectionPosition: 'none',
	        multiSelect: true,
	        model: 'PortfolioItem/Feature',
	        field: 'State',
	        scope: this,
	        listeners: {
	        	change: function(combo) {
					console.log('Feature State: ', combo.lastSelection);
					//console.log('store', this._milestoneComboStore);

					this._featureStateExclude = combo.lastSelection;

				},
				scope: this
	        }
	    };


	    var excludedDependentStatesComboBox = { 
        	xtype: 'rallyfieldvaluecombobox',
	        fieldLabel: 'Exclude Dependent Feature States',
	        id: 'excludedDependentStatesComboBox',
	        multiSelect: true,
	        defaultSelectionPosition: 'none',
	        model: 'PortfolioItem/Feature',
	        field: 'State',
	        scope: this,
	        listeners: {
	        	change: function(combo) {
					console.log('Dependent Feature State: ', combo.lastSelection);
					//console.log('store', this._milestoneComboStore);

					this._dependentFeatureStateExclude = combo.lastSelection;

				},
				scope: this
	        }
	    };


	    var excludedScheduleStatesComboBox = { 
        	xtype: 'rallyfieldvaluecombobox',
	        fieldLabel: 'Exclude Story States',
	        id: 'excludedScheduleStatesComboBox',
	        defaultSelectionPosition: 'none',
	        multiSelect: true,
	        hidden: true,
	        model: 'HierarchicalRequirement',
	        field: 'ScheduleState',
	        scope: this,
	        listeners: {
	        	change: function(combo) {
					console.log('Story State: ', combo.lastSelection);
					//console.log('store', this._milestoneComboStore);

					this._featureStateExclude = combo.lastSelection;

				},
				scope: this
	        }
	    };


	    var excludedDependentScheduleStatesComboBox = { 
        	xtype: 'rallyfieldvaluecombobox',
	        fieldLabel: 'Exclude Dependent Story States',
	        id: 'excludedDependentScheduleStatesComboBox',
	        defaultSelectionPosition: 'none',
	        multiSelect: true,
	        hidden: true,
	        model: 'HierarchicalRequirement',
	        field: 'ScheduleState',
	        scope: this,
	        listeners: {
	        	change: function(combo) {
					console.log('Dependent Story State: ', combo.lastSelection);
					//console.log('store', this._milestoneComboStore);

					this._dependentFeatureStateExclude = combo.lastSelection;

				},
				scope: this
	        }
	    };

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
			id: 'filterPanel',
			autoWidth: true,
			layout: 'hbox',

			items: [{
				xtype: 'panel',
				title: 'Filter:',
				id: 'innerFilterPanel',
				flex: 3,
				align: 'stretch',
				autoHeight: true,
				bodyPadding: 10,
				items: [{
		            xtype      : 'radiogroup',
		            id: 'featureStoriesRadioGroup', 
		            items: [
		                {
		                	xtype	  : 'radiofield',				            
		                    id        : 'radio1',
		                    name      : 'parameter',
		                    boxLabel  : 'Features',
		                    checked   : true,
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
				            	Ext.ComponentQuery.query('#excludedStatesComboBox')[0].show();
				            	Ext.ComponentQuery.query('#excludedDependentStatesComboBox')[0].show();
				            	Ext.ComponentQuery.query('#excludedScheduleStatesComboBox')[0].hide();
				            	Ext.ComponentQuery.query('#excludedDependentScheduleStatesComboBox')[0].hide();

				            	Ext.ComponentQuery.query('#excludedScheduleStatesComboBox')[0].setValue();
								Ext.ComponentQuery.query('#excludedDependentScheduleStatesComboBox')[0].setValue();
				            } else if (value === 's') {
				            	storiesFilter.show();
				            	Ext.ComponentQuery.query('#releaseRadio')[0].setValue('r');
				            	Ext.ComponentQuery.query('#excludedStatesComboBox')[0].hide();
				            	Ext.ComponentQuery.query('#excludedDependentStatesComboBox')[0].hide();
				            	Ext.ComponentQuery.query('#excludedScheduleStatesComboBox')[0].show();
				            	Ext.ComponentQuery.query('#excludedDependentScheduleStatesComboBox')[0].show();

				            	Ext.ComponentQuery.query('#excludedStatesComboBox')[0].setValue();
								Ext.ComponentQuery.query('#excludedDependentStatesComboBox')[0].setValue();
				            } else {
				            	releaseComboBox.hide();
				            	iterationComboBox.hide();
				            	storiesFilter.hide();
				            }				            
				        },
				        scope: this
				    }
		        }, 
	        		excludedStatesComboBox, 
	        		excludedDependentStatesComboBox,
	        		excludedScheduleStatesComboBox, 
	        		excludedDependentScheduleStatesComboBox,
		        {
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
			}, {
					xtype: 'panel',
					title: 'Milestone Filter:',
					//width: 450,
					//layout: 'fit',
					flex: 3,
					align: 'stretch',
					autoHeight: true,
					bodyPadding: 10,
					items: [{
						xtype: 'datefield',
						anchor: '100%',
				        fieldLabel: 'From',
						scope: this,
			        	listeners : {
			        		change: function(picker, newDate, oldDate) {
			        			this._initDate = newDate;
			        			var that = this;

			        			//console.log('Store:', this._milestoneComboStore);
			        			this._applyMilestoneRangeFilter(this._initDate, this._endDate, this._milestoneComboStore, that);
			        		},
			        		scope:this
			        	}
					}, {
						xtype: 'datefield',
						anchor: '100%',
				        fieldLabel: 'To',
						scope: this,
			        	listeners : {
			        		change: function(picker, newDate, oldDate) {
			        			this._endDate = newDate;
			        			var that = this;

			        			//console.log('Store:', this._milestoneComboStore);
			        			this._applyMilestoneRangeFilter(this._initDate, this._endDate, this._milestoneComboStore, that);
			        		},
			        		scope:this
			        	}
					}, {					
				        xtype: 'rallyfieldvaluecombobox',
				        fieldLabel: 'Milestone Types',
				        model: 'Milestone',
				        field: 'c_Type',
				        scope: this,
				        listeners: {
				        	change: function(combo) {
								console.log('Milestone type: ', combo.getValue());
								//console.log('store', this._milestoneComboStore);

								this._milestoneType = combo.getValue();

								this._applyMilestoneRangeFilter(this._initDate, this._endDate, this._milestoneComboStore, this, this._milestoneType);
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
				
				{
					xtype: 'fieldcontainer',
					fieldLabel: 'Milestone',
					pack: 'end',
					labelAlign: 'right',
					items: [
						this._milestoneCombo
					]
				},
				searchButton
			]
		}]);

		Ext.ComponentQuery.query('#storiesRadioFilter')[0].hide();

		// releaseComboBox.hide();
    	iterationComboBox.hide();
    },


    _applyMilestoneRangeFilter: function(initDate, endDate, store, scope, milestoneType) {
		//console.log(initDate, endDate, store, scope);
		if (initDate && !endDate && !milestoneType) {
			this._milestoneComboStore.filterBy(function(record) {
				if (record.get('TargetDate')) {
					if (record.get('TargetDate').getTime() > initDate.getTime()) {
						return record;
					}
				}
			}, scope);

		} else if (endDate && !initDate && !milestoneType) {
			this._milestoneComboStore.filterBy(function(record) {
				if (record.get('TargetDate')) {
					if (record.get('TargetDate').getTime() < endDate.getTime()) {
						return record;
					}
				}
			}, scope);
		} else if (initDate && endDate && !milestoneType) {
			this._milestoneComboStore.filterBy(function(record) {
				if (record.get('TargetDate')) {
					if ((record.get('TargetDate').getTime() > initDate.getTime()) && 
						(record.get('TargetDate').getTime() < endDate.getTime())) {
						return record;
					}
				}
			}, scope);
		} else if (initDate && !endDate && milestoneType) {
			this._milestoneComboStore.filterBy(function(record) {
				if (record.get('TargetDate')) {
					if (record.get('TargetDate').getTime() > initDate.getTime() &&
						(record.get('c_Type') === this._milestoneType)) {
						return record;
					}
				}
			}, scope);
		} else if (!initDate && endDate && milestoneType) {
			this._milestoneComboStore.filterBy(function(record) {
				if (record.get('TargetDate')) {
					if (record.get('TargetDate').getTime() < initDate.getTime() &&
						(record.get('c_Type') === this._milestoneType)) {
						return record;
					}
				}
			}, scope);
		} else if (!initDate && !endDate && milestoneType) {
			this._milestoneComboStore.filterBy(function(record) {
				if (record.get('c_Type') && (record.get('c_Type') === this._milestoneType) ) {
					return record;
				}
			}, scope);
		} else if (endDate && initDate && milestoneType) {
			this._milestoneComboStore.filterBy(function(record) {
				if (record.get('TargetDate')) {
					if (record.get('TargetDate').getTime() < endDate.getTime() &&
						(record.get('TargetDate').getTime() > initDate.getTime()) &&
						(record.get('c_Type') === this._milestoneType)) {
						return record;
					}
				}
			}, scope);
		} else {
			this._milestoneComboStore.filterBy(function(record) {				
				return record;
			});
		}
	},

	_blockFilters: function() {
		this.down('#header').disable();
	},


	_unBlockFilters: function() {
		this.down('#header').enable();
	},


    _doSearch: function() {
    	this.down('#bodyContainer').removeAll();
    	this.myMask.show();
    	
    	var types = this._getTypes();
    	var filters = this._getFilters();

    	console.log('filters for search', filters);

        var featureStore = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: types,
            filters: filters,
            fetch: ['Name', 
            		'FormattedID',
            		'ScheduleState',
            		'State',
            		'PercentDoneByStoryPlanEstimate',
            		'Release',
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

	                                if (predecessors[0] !== 'empty') {
	                                	artifact.get('Predecessors')['data'] = predecessors;
	                                	//console.log('tcs attached: ', tcs);
	                                }

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
	                        console.log('creating call to load successors for', sPromise, sInfo);

	                        Deft.Promise.all(sPromise).then({
	                            success: function(successors) {
	                                console.log('s loaded for:', successors,sInfo);

	                                if (successors[0] !== 'empty') {
	                                	artifact.get('Successors')['data'] = successors;
	                                	//console.log('tcs attached: ', tcs);
	                                }

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

    	var predFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'Predecessors.ObjectID',
			operator: '!=',
			value: 'null'
		});

		var succFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'Successors.ObjectID',
			operator: '!=',
			value: 'null'
		});

    	var dependencyFilter = predFilter.or(succFilter);

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

	    if (this._searchParameter === 'f' && this._featureStateExclude && this._featureStateExclude.length > 0) {
	    	console.log('exclude filters:', this._featureStateExclude);

	    	var lfs = this._getExcludadeFeatureStateFilter();

	    	_.each(lfs, function(filter) {
    			dependencyFilter = dependencyFilter.and(filter);
	    	}, this);
	    }


	    if (this._searchParameter === 's' && this._featureStateExclude && this._featureStateExclude.length > 0) {
	    	console.log('exclude story filters:', this._featureStateExclude);

	    	var lfs = this._getExcludadeStoryScheduleStateFilter();

	    	_.each(lfs, function(filter) {
    			dependencyFilter = dependencyFilter.and(filter);
	    	}, this);
	    }

	   	var finalFilter = filters.and(dependencyFilter);

	   	var milestoneFilter = this._getMilestoneFilter();

	   	if (milestoneFilter) {
	   		finalFilter = finalFilter.and(milestoneFilter);
	   	}

    	return finalFilter;
    },


    _getMilestoneFilter: function() {
    	var milestoneFilter = null;


    	if (this._selectedMilestones && this._selectedMilestones.length > 0) {
	    	_.each(this._selectedMilestones, function(milestone) {
	    		var milestoneTag = milestone.get('_ref');

	    		var newMilestoneFilter = Ext.create('Rally.data.QueryFilter', {
					property: 'Milestones',
					operator: 'contains',
					value: milestoneTag
				});

	    		if (milestoneFilter) {
	    			milestoneFilter = milestoneFilter.or(newMilestoneFilter);
	    		} else {
	    			milestoneFilter = newMilestoneFilter;
	    		}

	    	}, this);
    	}


		console.log('filter', milestoneFilter);
		return milestoneFilter;
    },


    _createGrid: function(artifacts) {
    	console.log('Creating grid with artifacts', artifacts);
    	var dataFeatures = [];

    	if (this._searchParameter === 'f') {
    		var countId = 0;
	    	_.each(artifacts, function(artifact) {

	    		//1 - dependent data
	    		//2 - owner data
	    		if (artifact.get('Predecessors') && artifact.get('Predecessors').data) {
	    			_.each(artifact.get('Predecessors').data, function(predecessor) {
	    				dataFeatures.push({
	    					CountID: countId,
			    			FormattedID: artifact.get('FormattedID') + ' - '  + artifact.get('Name'),
			    			Release: artifact.get('Release') ? artifact.get('Release').Name : '',
			    			State: artifact.get('State') ? artifact.get('State').Name : '',
			    			PercentDoneByStoryPlanEstimate: artifact.get('PercentDoneByStoryPlanEstimate'),
			    			Project: artifact.get('Project').Name,
			    			Type: 'P',
			    			DependentFeature: predecessor.get('FormattedID') + ' - '  + predecessor.get('Name'),
			    			DependentPercentDoneByStoryPlanEstimate : predecessor.get('PercentDoneByStoryPlanEstimate'),
			    			DependentProject: predecessor.get('Project').Name,
			    			DependentRelease: predecessor.get('Release') ? predecessor.get('Release').Name : '',
			    			DependentState: predecessor.get('State') ? predecessor.get('State').Name : '',
			    			DependentPlannedEndDate: predecessor.get('PlannedEndDate')
			    		});
	    			}, this);
	    		}


	    		if (artifact.get('Successors') && artifact.get('Successors').data) {
	    			_.each(artifact.get('Successors').data, function(successor) {
	    				dataFeatures.push({
	    					CountID: countId,
			    			FormattedID: artifact.get('FormattedID') + ' - '  + artifact.get('Name'),
			    			Release: artifact.get('Release') ? artifact.get('Release').Name : '',
			    			State: artifact.get('State') ? artifact.get('State').Name : '',
			    			PercentDoneByStoryPlanEstimate: artifact.get('PercentDoneByStoryPlanEstimate'),
			    			Project: artifact.get('Project').Name,
			    			Type: 'S',
			    			DependentFeature: successor.get('FormattedID') + ' - '  + successor.get('Name'),
			    			DependentPercentDoneByStoryPlanEstimate: successor.get('PercentDoneByStoryPlanEstimate'),
			    			DependentProject: successor.get('Project').Name,
			    			DependentRelease: successor.get('Release') ? successor.get('Release').Name : '',
			    			DependentState: successor.get('State') ? successor.get('State').Name : '',
			    			DependentPlannedEndDate: successor.get('PlannedEndDate')
			    		});
	    			}, this);
	    		}

	    		countId++;

			}, this);
    	} else {
			var countId = 0;
    		_.each(artifacts, function(artifact) {

	    		if (artifact.get('Predecessors') && artifact.get('Predecessors').data) {
	    			_.each(artifact.get('Predecessors').data, function(predecessor) {
	    				dataFeatures.push({
	    					CountID: countId,
			    			FormattedID: artifact.get('FormattedID') + ' - '  + artifact.get('Name'),
			    			Release: artifact.get('Release') ? artifact.get('Release').Name : '',
			    			Iteration: artifact.get('Iteration') ? artifact.get('Iteration').Name : '',
			    			State: artifact.get('ScheduleState'),
			    			Project: artifact.get('Project').Name,
			    			Type: 'P',
			    			DependentFeature: predecessor.get('FormattedID') + ' - '  + predecessor.get('Name'),
			    			DependentProject: predecessor.get('Project').Name,
			    			DependentRelease: predecessor.get('Release') ? predecessor.get('Release').Name : '',
			    			DependentIteration: predecessor.get('Iteration') ? predecessor.get('Iteration').Name : '',
			    			DependentState: predecessor.get('ScheduleState') ? predecessor.get('ScheduleState') : ''
			    		});
	    			}, this);
	    		}


	    		if (artifact.get('Successors') && artifact.get('Successors').data) {
	    			_.each(artifact.get('Successors').data, function(successor) {
	    				dataFeatures.push({
	    					CountID: countId,
			    			FormattedID: artifact.get('FormattedID') + ' - '  + artifact.get('Name'),
			    			Release: artifact.get('Release') ? artifact.get('Release').Name : '',
			    			Iteration: artifact.get('Iteration') ? artifact.get('Iteration').Name : '',
			    			State: artifact.get('ScheduleState'),
			    			Project: artifact.get('Project').Name,
			    			Type: 'S',
			    			DependentFeature: successor.get('FormattedID') + ' - '  + successor.get('Name'),
			    			DependentProject: successor.get('Project').Name,
			    			DependentRelease: successor.get('Release') ? successor.get('Release').Name : '',
			    			DependentIteration: successor.get('Iteration') ? successor.get('Iteration').Name : '',
			    			DependentState: successor.get('ScheduleState') ? successor.get('ScheduleState') : ''
			    		});
	    			}, this);
	    		}

	    		countId++;
			}, this);
    	}



    	var featureStore = Ext.create('Ext.data.JsonStore', {
			fields:['CountID',
					'FormattedID', 
					'Type', 
					'Project', 
					'State', 
					'Release', 
					'Iteration', 
					'DependentFeature', 
					'PercentDoneByStoryPlanEstimate',
					'DependentProject', 
					'DependentState', 
					'DependentPercentDoneByStoryPlanEstimate',
					'DependentIteration', 
					'DependentRelease',
					'DependentPlannedEndDate'],
            data: dataFeatures
        });

    	var columns;
    	if (this._searchParameter === 'f') {
    		columns = [
    			{
                    text: 'Count ID',
                    dataIndex: 'CountID',
                    flex: 1
                },
                {
                    text: 'Feature #',
                    dataIndex: 'FormattedID',
                    flex: 3
                 //    renderer: function (value, meta, record, rowIndex, colIndex, store) {
	                //     var first = !rowIndex || value !== store.getAt(rowIndex - 1).get('FormattedID'),
	                //         last = rowIndex >= store.getCount() - 1 || value !== store.getAt(rowIndex + 1).get('FormattedID');
	                //     	meta.css += 'row-span' + (first ? ' row-span-first' : '') +  (last ? ' row-span-last' : '');
	                //     	if (first) {
	                //         	var i = rowIndex + 1;
	                //         	while (i < store.getCount() && value === store.getAt(i).get('FormattedID')) {
	                //             	i++;
	                //         	}
	                //         var rowHeight = 20, padding = 6,
	                //             height = (rowHeight * (i - rowIndex) - padding) + 'px';
	                //         meta.attr = 'style="height:' + height + ';line-height:' + height + ';"';
	                //     }
	                //     }
	                //     }
	                //     return first ? value : '';
	                // }
                },
                {
                    text: 'Feature State',
                    dataIndex: 'State',
                    flex: 1
                },
                {
                    text: 'Feature Project',
                    dataIndex: 'Project',
                    flex: 1
                },
                {
                	text: 'Percent Done By Story PlanEstimate',
                	dataIndex: 'PercentDoneByStoryPlanEstimate',
                	flex: 2,
                	xtype:'templatecolumn',
                	tpl: Ext.create('Rally.ui.renderer.template.progressbar.PercentDoneByStoryPlanEstimateTemplate', {
                    	isClickable: false,
                    	showDangerNotificationFn : function() {
                    		return false;
                    	}
                    })
                	// renderer  : function(percent) {
                 //        return Ext.util.Format.number(percent * 100, '0.##%');
                 //    }
                },
                {
                    text: 'Dependent P/S',
                    dataIndex: 'Type',
                    flex: 1
                },
                {
                    text: 'Dependent Feature #', 
                    dataIndex: 'DependentFeature',
                    flex: 3
                },
                {
                	text: 'Dependent Feature Percent Done By Story PlanEstimate',
                	dataIndex: 'DependentPercentDoneByStoryPlanEstimate',
                	flex: 2,
                	xtype:'templatecolumn',
                	tpl: Ext.create('Rally.ui.renderer.template.progressbar.PercentDoneByStoryPlanEstimateTemplate', {
                    	isClickable: false,
                    	percentDoneName: 'DependentPercentDoneByStoryPlanEstimate',
                    	showDangerNotificationFn : function() {
                    		return false;
                    	}
                    })
                },
                {
                    text: 'Dependent Project', 
                    dataIndex: 'DependentProject',
                    flex: 1
                },
                {
                    text: 'Dependent Release',
                    dataIndex: 'DependentRelease',
                    flex: 1
                },
                {
                    text: 'Dependent State',
                    dataIndex: 'DependentState',
                    flex: 1
                },
                {
                    text: 'Dependent PlannedEndDate',
                    dataIndex: 'DependentPlannedEndDate',
                    xtype: 'datecolumn',
                    format   : 'm/d/Y',
                    flex: 1
                }
            ];
    	} else {
    		columns = [
    			{
                    text: 'Count ID',
                    dataIndex: 'CountID',
                    flex: 1
                },
                {
                    text: 'Story #',
                    dataIndex: 'FormattedID',
                    flex: 3
                },
                {
                    text: 'Story State',
                    dataIndex: 'State',
                    flex: 1
                },
                {
                    text: 'Story Project',
                    dataIndex: 'Project',
                    flex: 1
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
                    text: 'Dependent Project', 
                    dataIndex: 'DependentProject',
                    flex: 1,
                },
                {
                    text: 'Dependent Release',
                    dataIndex: 'DependentRelease',
                    flex: 1,
                },
                {
                    text: 'Dependent Iteration',
                    dataIndex: 'DependentIteration',
                    flex: 1,
                },
                {
                    text: 'Dependent State',
                    dataIndex: 'DependentState',
                    flex: 1,
                }
            ];
    	}

        var featuresGrid;
        featuresGrid = Ext.create('Ext.grid.Panel', {
    		//width: 500,
    		itemId : 'featuresGrid',
    		store: featureStore,
    		//sortableColumns: false,
    		viewConfig : {
    			enableTextSelection: true,
    			listeners: {
		            viewready: function(view) {
		            	console.log('viewready, view');
		                // console.log('ext calling update rowspan', columns);
		                // console.log('ext calling update rowspan', featuresGrid);
		                // console.log('ext calling update rowspan', featureStore);
		                //featureStore.filter('Type', 'P');
		                this._updateRowSpan(columns, featuresGrid, featureStore);

		            }, 
		            sortchange: function(store, filters) {
		            	console.log('sort change, view');
	            	 	console.log('ext calling update rowspan', columns);
		                console.log('ext calling update rowspan', featuresGrid);
		                console.log('ext calling update rowspan', featureStore);
		                this._updateRowSpan(columns, featuresGrid, featureStore);
		            },
		            scope:this
		        }
    		},
    		listeners: {
	            sortchange: function(store, filters) {
	            	console.log('sort change, grid');
            	 	console.log('ext calling update rowspan', columns);
	                console.log('ext calling update rowspan', featuresGrid);
	                console.log('ext calling update rowspan', featureStore);
	                this._updateRowSpan(columns, featuresGrid, featureStore);
	            },
	            scope:this
	        },

    		columns: columns
        });
        	

        var predSuccFilter = {
			xtype: 'panel',
			id: 'predSuccFilterPanel',
			flex: 3,
			align: 'stretch',
			autoHeight: true,
			bodyPadding: 10,
			items: [{
	            xtype      : 'radiogroup',
	            id         : 'predSuccFilterRadio',
	            fieldLabel : 'Choose filter',
	            columns    : 3,
	            vertical: true,  
	            items: [
	                {
	                	xtype	  : 'radiofield',				            
	                    id        : 'radiop',
	                    name      : 'psaFilter',
	                    boxLabel  : 'Predecessors',
	                    padding: '0 10 0 0',				            
	                    inputValue: 'p'
	                }, {
	                    id        : 'radios',
	                    name      : 'psaFilter',
	                    boxLabel  : 'Successors',
	                    padding: '0 10 0 0',			            
	                    inputValue: 's'
	                }, {
	                    id        : 'radioa',
	                    name      : 'psaFilter',
	                    boxLabel  : 'All',
	                    cheked	  : true,
	                    padding: '0 10 0 0',			            
	                    inputValue: 'a'
	                }
	            ],
	            listeners: {
			        change: function(field, newValue, oldValue) {
			            var value = newValue.psaFilter;

			            console.log('value radio:', value);

			            // var storiesFilter = Ext.ComponentQuery.query('#storiesRadioFilter')[0];

			            if (value === 'p') {
			            	//filter only Type == p
			            	featureStore.clearFilter(true);
			            	featureStore.filter('Type', 'P');
			            } else if (value === 's') {
			            	//filter only Type == s
			            	featureStore.clearFilter(true);
			            	featureStore.filter('Type', 'S');
			            } else {
			            	//clear filter
			            	featureStore.clearFilter(false);
			            }
			            this._updateRowSpan(columns, featuresGrid, featureStore);			            
			        },
			        scope: this
			    }
	        }]
		};


		var exportButton = Ext.create('Rally.ui.Button', {
        	text: 'Export',
        	margin: '10 10 10 10',
        	scope: this,
        	handler: function() {
        		var csv = this._convertToCSV(dataFeatures);
        		console.log('converting to csv:', csv);


        		//Download the file as CSV
		        var downloadLink = document.createElement("a");
		        var blob = new Blob(["\ufeff", csv]);
		        var url = URL.createObjectURL(blob);
		        downloadLink.href = url;
		        downloadLink.download = "report.csv";  //Name the file here
		        document.body.appendChild(downloadLink);
		        downloadLink.click();
		        document.body.removeChild(downloadLink);
        	}
        });

        var mainPanel = Ext.create('Ext.panel.Panel', {			
			title: 'TEAMS WORK ITEMS AND ALIGNED DEPENDENCIES',
			//autoWidth: true,
			autoScroll: true,
            layout: {
				type: 'vbox',
				align: 'stretch',
				//padding: 5
			},
            //padding: 5,            
            items: [
            	predSuccFilter,
                featuresGrid               
            ]
        });

		this.down('#bodyContainer').add(mainPanel);
		this.down('#bodyContainer').add(exportButton);
		// Ext.ComponentQuery.query('#radioa')[0].setValue('a');
		//this._updateRowSpan(columns, featuresGrid, featureStore);


    },

	_updateRowSpan: function(columns, grid, store) {
        var columns = columns,//this.columns,
            view = grid.getView(),//this.getView(),
            store = store,//this.getStore(),
            rowCount = store.getCount(),
            
            column = columns[1],
            dataIndex = column.dataIndex,
            
            spanCell = null,
            spanCell1 = null,
            spanCell2 = null,
            spanCount = null,
            spanValue = null;

        for (var row = 0; row < rowCount; ++row) {
            var cell = view.getCellByPosition({ row: row, column: 0 }).dom;
            var cell1 = view.getCellByPosition({ row: row, column: 1 }).dom;
            var cell2 = view.getCellByPosition({ row: row, column: 2 }).dom;

            var record = store.getAt(row);
            var value = record.get(dataIndex);
            
            if (spanValue !== value) {
                if (spanCell !== null) {
                    spanCell.rowSpan = spanCount;
                    spanCell1.rowSpan = spanCount;
                    spanCell2.rowSpan = spanCount;
                }
                
                Ext.fly(cell).setStyle('display', '');
                Ext.fly(cell).setStyle('vertical-align', 'middle');
                Ext.fly(cell1).setStyle('display', '');
                Ext.fly(cell1).setStyle('vertical-align', 'middle');
                Ext.fly(cell2).setStyle('display', '');
                Ext.fly(cell2).setStyle('vertical-align', 'middle');
                spanCell = cell;
                spanCell1 = cell1;
                spanCell2 = cell2;
                spanCount = 1;
                spanValue = value;
            } else {
                spanCount++;
                Ext.fly(cell).setStyle('display', 'none');
                Ext.fly(cell1).setStyle('display', 'none');
                Ext.fly(cell2).setStyle('display', 'none');
            }
        }
        
        if (spanCell !== null) {
            spanCell.rowSpan = spanCount;
            spanCell1.rowSpan = spanCount;
            spanCell2.rowSpan = spanCount;
        }
    },


    _getExcludadeFeatureStateFilter: function() {
    	console.log('exclude filters:', this._featureStateExclude);
    	var excludedFilter = undefined;

    	var lfs = [];
    	_.each(this._featureStateExclude, function(comboRecord) {
    		var state = comboRecord.get('name');

    		if (state !== '-- No Entry --') {
	    		var f = Ext.create('Rally.data.QueryFilter', {
					property: 'State',
					operator: '!=',
					value: state
		    	});

		    	lfs.push(f);	    			
    		}
    	}, this);

    	return lfs;
    },



    _getExcludadeStoryScheduleStateFilter: function() {
    	var excludedFilter = undefined;

    	var lfs = [];
    	_.each(this._featureStateExclude, function(comboRecord) {
    		var state = comboRecord.get('name');

    		if (state) {
	    		var f = Ext.create('Rally.data.QueryFilter', {
					property: 'ScheduleState',
					operator: '!=',
					value: state
		    	});

		    	lfs.push(f);	    			
    		}
    	}, this);

    	console.log('exclude story filters:', lfs);
    	return lfs;
    },


    _getDependentExcludadeFeatureStateFilter: function() {
    	console.log('exclude dependent filters:', this._dependentFeatureStateExclude);
    	var excludedFilter = undefined;

    	var lfs = [];
    	_.each(this._dependentFeatureStateExclude, function(comboRecord) {
    		var state = comboRecord.get('name');

    		if (state !== '-- No Entry --') {
	    		var f = Ext.create('Rally.data.QueryFilter', {
					property: 'State',
					operator: '!=',
					value: state
		    	});

		    	lfs.push(f);	    			
    		}
    	}, this);

    	console.log('exclude dependent feature filters:', lfs);
    	return lfs;
    },


    _getDependentExcludadeStoryScheduleStateFilter: function() {
    	console.log('exclude dependent filters:', this._dependentFeatureStateExclude);
    	var excludedFilter = undefined;

    	var lfs = [];
    	_.each(this._dependentFeatureStateExclude, function(comboRecord) {
    		var state = comboRecord.get('name');

    		if (state) {
	    		var f = Ext.create('Rally.data.QueryFilter', {
					property: 'ScheduleState',
					operator: '!=',
					value: state
		    	});

		    	lfs.push(f);	    			
    		}
    	}, this);

    	console.log('exclude dependent story filters:', lfs);
    	return lfs;
    },



    _loadPredecessors: function(artifact) {
        var deferred = Ext.create('Deft.Deferred');
        //console.log('loading tc for story:', story);

        var filter = [];
        if (this._searchParameter =='f' && this._dependentFeatureStateExclude) {
        	filter = this._getDependentExcludadeFeatureStateFilter();
        }

        if (this._searchParameter =='s' && this._dependentFeatureStateExclude) {
        	filter  = this._getDependentExcludadeStoryScheduleStateFilter();
        }

        artifact.getCollection('Predecessors').load({
            fetch: ['Name',
            		'FormattedID',
            		'ScheduleState',
            		'State',
            		'Project',
            		'PlanEstimate',
            		'PercentDoneByStoryPlanEstimate',
            		'LeafStoryPlanEstimateTotal',
            		'Release',
            		'Iteration',
            		'PlannedEndDate'
            	   ],
            filters : filter,
            scope: this,
            callback: function(records, operation, success) {
                console.log('predecessor loaded:', records);

                if (records.length > 0) {
                	deferred.resolve(records); 
                } else {
                	deferred.resolve(['empty']);
                }              
            }
        });                    

        return deferred.promise;
    },


    _loadSuccessors: function(artifact) {
        var deferred = Ext.create('Deft.Deferred');
        //console.log('loading tc for story:', story);

        var filter = [];
        if (this._searchParameter =='f' && this._dependentFeatureStateExclude) {
        	filter = this._getDependentExcludadeFeatureStateFilter();
        }

        if (this._searchParameter =='s' && this._dependentFeatureStateExclude) {
        	filter  = this._getDependentExcludadeStoryScheduleStateFilter();
        }

        artifact.getCollection('Successors').load({
            fetch: ['Name',
            		'FormattedID',
            		'ScheduleState',
            		'State',
            		'Project',
            		'PlanEstimate',
            		'LeafStoryPlanEstimateTotal',
            		'PercentDoneByStoryPlanEstimate',
            		'Release',
            		'Iteration',
            		'PlannedEndDate'
            	   ],
    	    filters : filter,
            scope: this,
            callback: function(records, operation, success) {
                console.log('successor loaded:', records);

                if (records.length > 0) {
                	deferred.resolve(records); 
                } else {
                	deferred.resolve(['empty']);
                }
            }
        });                    

        return deferred.promise;

    },


    _convertToCSV: function(objArray) {
		var fields = Object.keys(objArray[0]);

		var replacer = function(key, value) { return value === null ? '' : value; };
		var csv = objArray.map(function(row){
		  return fields.map(function(fieldName) {
		    return JSON.stringify(row[fieldName], replacer);
		  }).join(',');
		});

		csv.unshift(fields.join(',')); // add header column

		//console.log(csv.join('\r\n'));

		return csv.join('\r\n');
    }
});
