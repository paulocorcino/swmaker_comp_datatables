// Modular DataTables Initialization for Webrun/Platform Environment

class WebrunDataTable {
    static instances = {};

    /**
     * Static methods to interact with any instance by ID
     */
    static handleCallRule(...args) {

        if (args.length === 0) return;
        var ruleObj = args[0];
        if (ruleObj == null) return;
        if (ruleObj && typeof ruleObj === 'object' && !Array.isArray(ruleObj) && Object.keys(ruleObj).length === 0) return;

        var ruleName = ruleObj.Nome;
        var params = ruleObj.Entrada.split(';')
            .filter(Boolean)
            .map(p => {
                let s = p.slice(p.indexOf('=') + 1).trim();
                // Unquote if surrounded by quotes
                if (s.length >= 2 && ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')))) {
                    return s.slice(1, -1);
                }
                return s;
            });

        params[0] = (args[1] && typeof args[1] === 'object' ? JSON.stringify(args[1]) : args[1]);
        params[1] = (args[2] && typeof args[2] === 'object' ? JSON.stringify(args[2]) : args[2]);

        ebfFlowExecute(ruleName, params);


        //console.log(ruleName, params);

        //console.log('Action Action:', args);

        //ebfFlowExecute(ruleName, params);        
    }

    static refresh(id) {
        if (this.instances[id]) this.instances[id].refreshData();
    }

    static clear(id) {
        if (this.instances[id]) this.instances[id].clearData();
    }

    static recreate(id) {
        if (this.instances[id]) this.instances[id].recreate();
    }

    static destroy(id) {
        if (this.instances[id]) this.instances[id].destroy();
    }

    static toggle(id, state) {
        if (this.instances[id]) this.instances[id].toggleVisibility(state);
    }

    static showColumn(id, name, visible) {
        if (this.instances[id]) this.instances[id].setColumnVisibility(name, visible);
    }

    static clearFilters(id) {
        if (this.instances[id]) this.instances[id].clearAllFilters();
    }

    static goToPage(id, page) {
        if (this.instances[id]) this.instances[id].goToPage(page);
    }

    static getTotalPages(id) {
        return this.instances[id] ? this.instances[id].getTotalPages() : 0;
    }

    static getTotalRecords(id) {
        return this.instances[id] ? this.instances[id].getTotalRecords() : 0;
    }

    static getCurrentPage(id) {
        return this.instances[id] ? this.instances[id].getCurrentPage() : 0;
    }

    static getColumns(id) {
        return this.instances[id] ? this.instances[id].getColumnsJSON() : [];
    }

    static getHiddenColumns(id) {
        return this.instances[id] ? this.instances[id].getHiddenColumnsJSON() : [];
    }

    static getData(id) {
        return this.instances[id] ? this.instances[id].getDataJSON() : [];
    }

    static getDataByColumn(id, column, value) {
        return this.instances[id] ? this.instances[id].getDataByColumn(column, value) : [];
    }

    static filterBy(id, col, v1, v2) {
        if (this.instances[id]) this.instances[id].filterBy(col, v1, v2);
    }

    static search(id, query) {
        if (this.instances[id]) this.instances[id].searchGlobal(query);
    }

    static setRowsPerPage(id, len) {
        if (this.instances[id]) this.instances[id].setRowsPerPage(len);
    }

    static print(id) {
        if (this.instances[id]) this.instances[id].printTable();
    }

    static selectAll(id) {
        if (this.instances[id]) {
            const instance = this.instances[id];
            instance.container.find('.webrun-dt-select-all').prop('checked', true);
            instance.container.find('.webrun-dt-checkbox').prop('checked', true);
        }
    }

    static deselectAll(id) {
        if (this.instances[id]) {
            const instance = this.instances[id];
            instance.container.find('.webrun-dt-select-all').prop('checked', false);
            instance.container.find('.webrun-dt-checkbox').prop('checked', false);
        }
    }

    static getSelectedValues(id) {
        if (this.instances[id]) {
            const instance = this.instances[id];
            const values = [];
            instance.container.find('.webrun-dt-checkbox:checked').each(function () {
                values.push($(this).val());
            });
            //console.log('Selected Values:', values);
            return values;
        }
        return [];
    }

    static addRow(id, rowData) {
        if (this.instances[id]) this.instances[id].addRow(rowData);
    }

    static removeRow(id, column, value) {
        if (this.instances[id]) this.instances[id].removeRow(column, value);
    }

    static updateSqlQuery(id, query) {
        if (this.instances[id]) this.instances[id].updateSqlQuery(query);
    }

    static loadJSON(id, data) {
        if (this.instances[id]) this.instances[id].loadJSON(data);
    }

    /**
     * Initializes a DataTable instance in a specific container.
     * @param {string} containerId - The ID of the generic container (e.g., 'DataTable1').
     * @param {object} options - Configuration options.
     */
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = $(`#${containerId}`);
        this.options = options;

        // Register in static registry
        WebrunDataTable.instances[containerId] = this;
        window.WebrunDT = WebrunDataTable; // Shortcut for easier global access
        this.sysCode = options.sysCode || null; // System Code
        this.formCode = options.formCode || null; // Form Code
        this.type = options.type || 'default';
        this.theme = options.theme || 'default'; // Ensuring theme is captured from options
        this.paginationTheme = (options.paginationTheme && options.paginationTheme.trim() !== '') ? options.paginationTheme : null;

        this.locale = options.locale || 'en_us'; // Default to EN_US
        this.dataLocale = options.dataLocale || this.locale; // Default to UI locale if not provided
        this.env = options.env || 'prod'; // 'dev' or 'prod'
        this.lastAjaxParams = null; // For debouncing
        this.lastAjaxTime = 0; // For debouncing
        this.abortNextAjax = false; // For debouncing
        this.pageLength = options.pageLength !== undefined ? options.pageLength : 10; // Default to 10
        this.pageLengthMax = options.pageLengthMax || 100; // Default max to 100
        this.showLength = options.showLength !== undefined ? options.showLength : true;
        this.showPagination = options.showPagination !== undefined ? options.showPagination : true;

        // Special Rule: If pageLength is 0 (intended as 'Auto/Fit'), showPagination is true, and showLength is false
        // We activate "Auto-Fit" mode: Calculate optimal page length to fill container.
        this.forceFullHeight = false;
        this.autoFitPageLength = false;

        if (this.pageLength === 0 && this.showPagination && !this.showLength) {
            //console.log("WebrunDataTable: Detected 'Auto-Fit' mode (pageLength: 0). Enabling dynamic page size.");
            this.pageLength = 10; // Start with a default, will be adjusted
            this.forceFullHeight = true; // Still want to force height loop
            this.autoFitPageLength = true;

            // User requested to force serverSide to false in this mode
            if (options.serverSide) {
                console.warn("WebrunDataTable: 'Auto-Fit' mode forces serverSide: false to allow client-side pagination.");
                this.serverSide = false;
            }
        }
        this.showSearch = options.showSearch !== undefined ? options.showSearch : true; // Global Search
        this.showHeader = options.showHeader !== undefined ? options.showHeader : true; // New option
        this.filterPosition = options.filterPosition || 'inside'; // 'inside' (wrapper) or 'top' (above table)
        this.scrollX = options.scrollX !== undefined ? options.scrollX : true; // New option
        this.scrollY = options.scrollY; // New option
        this.showFilter = options.showFilter !== undefined ? options.showFilter : true; // Custom Filters Toolbar
        this.filterCompact = options.filterCompact !== undefined ? options.filterCompact : false; // Compact Filters
        this.showInfo = options.showInfo !== undefined ? options.showInfo : true;
        this.showPagination = options.showPagination !== undefined ? options.showPagination : true;
        this.showOrdering = options.showOrdering !== undefined ? options.showOrdering : true;
        this.clickableRows = options.clickableRows !== undefined ? options.clickableRows : false;
        this.striped = options.striped !== undefined ? options.striped : true;
        this.onRowClick = options.onRowClick || null; // Callback: 'instance.myClickAction(rowData)'
        this.onButtonClick = options.onButtonClick || null; // Callback: 'instance.myAction(rowData)'
        this.onAfterLoad = options.onAfterLoad || null; // Callback: 'instance.myAfterLoadAction(instance, trigger)'
        this.onCheckboxClick = options.onCheckboxClick || null; // Callback: 'instance.myCheckboxAction(state, value)'
        this.datasetSource = options.datasetSource || 'client'; // 'client' or 'server'
        this.dbSource = options.dbSource || ''; // New option for database source string
        this.sqlQuery = options.sqlQuery || '';
        this.dataJSON = options.dataJSON || '[]';
        this.refreshInterval = parseInt(options.refreshInterval) || 0; // In seconds
        this.verticalAlignment = options.verticalAlignment || 'top'; // top, middle, bottom
        this.rowHeight = options.rowHeight || null; // in px
        this.headerHeight = options.headerHeight || null; // in px
        this.headerBackground = options.headerBackground || null; // hex or color name
        this.headerColor = options.headerColor || null; // hex or color name
        this.borderColor = options.borderColor || null; // hex or color name
        this.rowColor = options.rowColor || null; // hex or color name
        this.rowBackground = options.rowBackground || null; // hex or color name
        this.rowStripedBackground = options.rowStripedBackground || null; // hex or color name

        // Border Visibility Options
        this.showHorizontalBorders = options.showHorizontalBorders !== undefined ? options.showHorizontalBorders : null;
        this.showVerticalBorders = options.showVerticalBorders !== undefined ? options.showVerticalBorders : null;
        this.showHorizontalBorders = options.showHorizontalBorders !== undefined ? options.showHorizontalBorders : null;
        this.showVerticalBorders = options.showVerticalBorders !== undefined ? options.showVerticalBorders : null;
        this.showOuterBorder = options.showOuterBorder !== undefined ? options.showOuterBorder : null;
        this.radius = options.radius !== undefined ? parseInt(options.radius) : 0; // Numeric Radius

        this.lastState = {
            search: '',
            order: [],
            page: 0
        };
        this.refreshTimer = null;
        this.processing = options.processing !== undefined ? options.processing : false;
        this.actionMainButton = options.actionMainButton || null;
        // Use this.serverSide if already forced, otherwise fallback to options
        this.serverSide = this.serverSide !== undefined ? this.serverSide : (options.serverSide !== undefined ? options.serverSide : false);
        this.filters = options.filters || []; // Array of { column: 'Name', type: 'select'|'date-range'|'number-range' }
        this.columnsDefinition = options.columns || []; // Array of { column: 'ID', label: 'Title', type: 'string'|'int'|'date'|'money' }
        this.disableScrollY = options.disableScrollY || false; // New option to disable vertical scroll

        // Infer filter types if not explicitly provided
        this.filters = this.filters.map(f => {
            if (f.type) return f;

            // Find the data column definition, ignoring auxiliary columns (checkboxes, buttons)
            const colDef = this.columnsDefinition.find(c =>
                c.column === f.column &&
                !['checkbox', 'button', 'group-button'].includes(c.type)
            );

            if (colDef) {
                if (colDef.type === 'date') f.type = 'date-range';
                else if (['numeric', 'money', 'number', 'int'].includes(colDef.type)) f.type = 'number-range';
                else f.type = 'select';
            } else {
                f.type = 'select'; // Fallback
            }
            return f;
        });

        // Formatter instances - Ensure PT-BR defaults for money/date as it's common in this environment
        const localeTag = this.dataLocale.replace('_', '-');
        this.numberFormatter = new Intl.NumberFormat(localeTag, { style: 'currency', currency: this.dataLocale.toLowerCase() === 'pt_br' ? 'BRL' : 'USD' });
        this.dateFormatter = new Intl.DateTimeFormat(localeTag);

        if (this.container.length === 0) {
            console.error(`WebrunDataTable: Container #${containerId} not found.`);
            return;
        }

        this.init();
    }

    /**
     * Executes a callback string (expression) in a specific scope.
     * @param {string} callbackString - The string expression to execute.
     * @param {object} args - Key-value pairs of variables to make available in the expression scope.
     */
    _executeCallback(callbackString, args = {}) {
        if (!callbackString || typeof callbackString !== 'string') return;
        try {
            const argNames = Object.keys(args);
            const argValues = Object.values(args);
            // eslint-disable-next-line no-new-func
            const fn = new Function(...argNames, `return ${callbackString}`);
            return fn.apply(null, argValues);
        } catch (e) {
            console.error(`WebrunDataTable: Error executing callback "${callbackString}"`, e);
        }
    }

    getLanguage() {
        if (this.locale.toLowerCase() === 'pt_br') {
            return {
                url: 'assets/dataTablesAssets/pt_BR.json'
            };
        }
        // Default (EN_US) - DataTables uses English by default if 'language' is not specified or empty object
        return {};
    }

    init() {
        // Re-query the container in case it was re-created by the platform (Maker/Webrun)
        this.container = $(`#${this.containerId}`);

        if (this.container.length === 0) {
            console.warn(`WebrunDataTable: Container #${this.containerId} not found yet. Retrying in 100ms...`);
            setTimeout(() => this.init(), 100);
            return;
        }

        // Add a class and data-id for styling robustness
        this.container.addClass('webrun-dt-container').attr('data-webrun-id', this.containerId).css('opacity', 0);

        // Load Theme CSS dynamically
        this.loadTheme(this.theme);

        // Setup Debounced ResizeObserver
        let resizeTimeout;
        this.resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.adjustTableHeight();
                // Explicitly adjust columns again to fix any width mismatch after resize
                if (this.dataTableInstance) {
                    this.dataTableInstance.columns.adjust().draw(false);
                }
            }, 100);
        });
        this.resizeObserver.observe(this.container[0]);

        //console.log(`Initializing WebrunDataTable inside #${this.containerId} with type: ${this.type}`);

        // 1. Clear Container (Children only, maintains the DIV itself)
        this.container.empty();

        // 2. Inject Layout
        this.renderLayout();

        // 3. Initialize DataTable
        this.initDataTable();

        // 4. Start Auto-refresh if applicable
        this.startAutoRefresh();

        // 4. Setup Filters (Deferred to initComplete to ensure injection first)
        // if (this.filters.length > 0) {
        //    this.setupFilterListeners();
        // }
    }

    renderLayout() {
        let filterHTML = '';
        if (this.showFilter && this.filters.length > 0) {
            // Flexbox container for filters (Toolbar)
            filterHTML = `<div id="filters-${this.containerId}" class="webrun-filters-toolbar d-inline-flex flex-wrap align-items-end gap-2 flex-grow-1">`;

            this.filters.forEach((f, idx) => {
                const colId = f.column.replace(/\s+/g, '-').toLowerCase();
                const labelText = f.label || f.column;

                // Determine Label HTML and Placeholders
                const labelHtml = this.filterCompact ? '' : `<label class="form-label mb-0 small me-1">${labelText}</label>`; // minimal styling
                const selectFirstOption = this.filterCompact ? `Todos ${labelText}` : 'Todos';
                const minPlaceholder = this.filterCompact ? ` placeholder="Mín ${labelText}"` : '';
                const maxPlaceholder = this.filterCompact ? ` placeholder="Máx ${labelText}"` : '';
                const startPlaceholder = this.filterCompact ? ` placeholder="Início ${labelText}"` : '';
                const endPlaceholder = this.filterCompact ? ` placeholder="Fim ${labelText}"` : '';

                if (f.type === 'select') {
                    filterHTML += `
                        <div class="filter-item">
                            ${this.filterCompact ? '' : `<div class="small mb-1">${labelText}</div>`}
                            <select id="filter-${this.containerId}-${colId}" data-column="${f.column}" class="form-select form-select-sm filter-select" style="min-width: 150px; width: 100%;" title="Filter by ${labelText}" data-bs-toggle="tooltip">
                                <option value="">${selectFirstOption}</option>
                            </select>
                        </div>`;
                } else if (f.type === 'number-range') {
                    if (this.filterCompact) {
                        filterHTML += `
                        <div class="filter-item">
                             <div class="input-group input-group-sm">
                                <input type="number" id="filter-${this.containerId}-${colId}-min" data-column="${f.column}" data-type="min" class="form-control filter-input" style="min-width: 50px; width: 50%; flex: 1;"${minPlaceholder} title="Min ${labelText}" data-bs-toggle="tooltip">
                                <input type="number" id="filter-${this.containerId}-${colId}-max" data-column="${f.column}" data-type="max" class="form-control filter-input" style="min-width: 50px; width: 50%; flex: 1;"${maxPlaceholder} title="Max ${labelText}" data-bs-toggle="tooltip">
                            </div>
                        </div>`;
                    } else {
                        // Standard layout
                        filterHTML += `
                        <div class="filter-item">
                            <div class="small mb-1">${labelText}</div>
                            <div class="input-group input-group-sm">
                                <span class="input-group-text">Mín</span>
                                <input type="number" id="filter-${this.containerId}-${colId}-min" data-column="${f.column}" data-type="min" class="form-control filter-input" style="min-width: 50px; width: 50%; flex: 1;" title="Min ${labelText}" data-bs-toggle="tooltip">
                                <span class="input-group-text">Máx</span>
                                <input type="number" id="filter-${this.containerId}-${colId}-max" data-column="${f.column}" data-type="max" class="form-control filter-input" style="min-width: 50px; width: 50%; flex: 1;" title="Max ${labelText}" data-bs-toggle="tooltip">
                            </div>
                        </div>`;
                    }

                } else if (f.type === 'date-range') {
                    filterHTML += `
                        <div class="filter-item">
                            ${this.filterCompact ? '' : `<div class="small mb-1">${labelText}</div>`}
                            <div class="input-group input-group-sm">
                                <input type="date" id="filter-${this.containerId}-${colId}-start" data-column="${f.column}" data-type="min" class="form-control filter-input" style="min-width: 120px; width: 50%; flex: 1;"${startPlaceholder} title="Start ${labelText}" data-bs-toggle="tooltip">
                                <input type="date" id="filter-${this.containerId}-${colId}-end" data-column="${f.column}" data-type="max" class="form-control filter-input" style="min-width: 120px; width: 50%; flex: 1;"${endPlaceholder} title="End ${labelText}" data-bs-toggle="tooltip">
                            </div>
                        </div>`;
                }
            });
            filterHTML += `</div>`;
        }

        let headerHTML = '';
        if (this.columnsDefinition.length > 0) {
            this.columnsDefinition.forEach(col => {
                headerHTML += `<th>${col.label || col.column}</th>`;
            });
        } /*else {
            // Default fallback headers
            headerHTML = `
                <th>Name</th>
                <th>Position</th>
                <th>Office</th>
                <th>Age</th>
                <th>Start date</th>
                <th>Salary</th>`;
        }*/

        // Apply vertical alignment and row height
        const alignClass = `webrun-dt-align-${this.verticalAlignment}`;
        let customStyles = `#${this.containerId} .dataTables_paginate { margin-top: 20px; }`;

        // Use container-relative selectors to handle DataTables splitting the table for scrolling
        const baseSelector = `.webrun-dt-container[data-webrun-id="${this.containerId}"]`;

        if (this.rowHeight) {
            customStyles += `${baseSelector} .dataTables_scrollBody td, ${baseSelector} tbody td { height: ${this.rowHeight}px !important; } `;
        }
        if (this.headerHeight) {
            // Apply height ONLY to the visible header wrapper (scroll mode)
            // and the direct table header (non-scroll mode).
            // CRITICAL: Exclude .dataTables_scrollBody thead th to avoid "ghost row" gap.
            customStyles += `
                ${baseSelector} .dataTables_scrollHead thead th {
                    height: ${this.headerHeight}px !important;
                    vertical-align: middle !important;
                }
                ${baseSelector} .dataTables_wrapper > table > thead > tr > th {
                    height: ${this.headerHeight}px !important;
                    vertical-align: middle !important;
                }
            `;
        }

        if (this.headerBackground) {
            customStyles += `
                ${baseSelector} .dataTables_scrollHead thead th,
                ${baseSelector} .dataTables_wrapper > table > thead > tr > th {
                    background-color: ${this.headerBackground} !important;
                }
            `;
        }

        if (this.headerColor) {
            customStyles += `
                ${baseSelector} .dataTables_scrollHead thead th,
                ${baseSelector} .dataTables_wrapper > table > thead > tr > th {
                    color: ${this.headerColor} !important;
                }
            `;
        }

        if (this.rowColor) {
            customStyles += `
                ${baseSelector} table.dataTable tbody tr td {
                    color: ${this.rowColor} !important;
                }
            `;
        }

        if (this.borderColor) {
            customStyles += `
                ${baseSelector} .dataTables_wrapper,
                ${baseSelector} .dataTables_wrapper table.dataTable,
                ${baseSelector} .dataTables_wrapper table.dataTable thead th,
                ${baseSelector} .dataTables_wrapper table.dataTable tbody td,
                ${baseSelector} .webrun-filters-toolbar,
                ${baseSelector} .dataTables_length,
                ${baseSelector} .dataTables_filter,
                ${baseSelector} .dataTables_paginate,
                ${baseSelector} .dataTables_info {
                    border-color: ${this.borderColor} !important;
                }
            `;
        }

        if (this.showOuterBorder === true) {
            customStyles += `
                 ${baseSelector} .dataTables_wrapper table.dataTable thead th:first-child,
                 ${baseSelector} .dataTables_wrapper table.dataTable tbody td:first-child {
                     border-left: 1px solid ${this.borderColor || '#e2e8f0'} !important;
                 }
                 ${baseSelector} .dataTables_wrapper table.dataTable thead th:last-child,
                 ${baseSelector} .dataTables_wrapper table.dataTable tbody td:last-child {
                     border-right: 1px solid ${this.borderColor || '#e2e8f0'} !important; 
                 }
                 ${baseSelector} .dataTables_wrapper table.dataTable tbody tr:last-child td {
                     border-bottom: 1px solid ${this.borderColor || '#e2e8f0'} !important;
                 }
             `;
        }


        // Horizontal Borders Visibility
        if (this.showHorizontalBorders === false && this.showOuterBorder === true) {
            customStyles += `
                ${baseSelector} .dataTables_wrapper table.dataTable thead th,
                ${baseSelector} .dataTables_wrapper table.dataTable tbody td {
                    border-bottom: none !important;
                }`;
        } else if (this.showHorizontalBorders === false) {
            customStyles += `
                ${baseSelector} .dataTables_wrapper table.dataTable thead th,
                ${baseSelector} .dataTables_wrapper table.dataTable tbody td {
                    border-bottom: none !important;
                    border-top: none !important; 
                }
            `;
        } else if (this.showHorizontalBorders === true && this.showOuterBorder != true) {
            customStyles += `                
                /* Remove bottom border from last row to avoid double border with wrapper */
                ${baseSelector} .dataTables_wrapper table.dataTable tbody tr:last-child td {
                    border-bottom: none !important;
                }
                /* Ensure no top border clashes */
                ${baseSelector} .dataTables_wrapper table.dataTable thead tr:first-child th {
                    border-top: none !important;
                }
            `;
        }

        // Vertical Borders Visibility
        if (this.showVerticalBorders === false) {
            customStyles += `
                ${baseSelector} .dataTables_wrapper table.dataTable thead th,
                ${baseSelector} .dataTables_wrapper table.dataTable tbody td {
                    border-right: none !important;
                    border-left: none !important;
                }
            `;
        } else if (this.showVerticalBorders === true && this.showOuterBorder != true) {
            customStyles += `
                ${baseSelector} .dataTables_wrapper table.dataTable thead th,
                ${baseSelector} .dataTables_wrapper table.dataTable tbody td {
                    border-right: 1px solid ${this.borderColor || '#e2e8f0'} !important;
                }
                /* Remove right border from last column to avoid double border with wrapper */
                ${baseSelector} .dataTables_wrapper table.dataTable thead th:last-child,
                ${baseSelector} .dataTables_wrapper table.dataTable tbody td:last-child {
                    border-right: none !important;
                }
                 /* Ensure no left border clashes */
                ${baseSelector} .dataTables_wrapper table.dataTable thead th:first-child,
                ${baseSelector} .dataTables_wrapper table.dataTable tbody td:first-child {
                    border-left: none !important;
                }
            `;
        }

        if (this.rowBackground) {
            customStyles += `
                ${baseSelector} table.dataTable tbody tr,
                ${baseSelector} table.dataTable tbody tr td {
                    background-color: ${this.rowBackground} !important;
                }
            `;
        }

        // Table Radius Logic
        if (this.radius > 0) {
            const r = this.radius + 'px';
            // border-collapse: separate is required for border-radius to work
            customStyles += `
                ${baseSelector} table.dataTable {
                   border-collapse: separate !important; 
                   border-spacing: 0 !important;
                   border-radius: ${r} !important; /* Apply to all corners */
                }

                /* Round top-left corner of the first header cell */
                ${baseSelector} table.dataTable thead tr:first-child th:first-child {
                    border-top-left-radius: ${r} !important;
                }

                /* Round top-right corner of the last header cell */
                ${baseSelector} table.dataTable thead tr:first-child th:last-child {
                    border-top-right-radius: ${r} !important;
                }
                
                /* Round bottom-left corner of the last body cell */
                ${baseSelector} table.dataTable tbody tr:last-child td:first-child {
                    border-bottom-left-radius: ${r} !important;
                }

                /* Round bottom-right corner of the last body cell */
                ${baseSelector} table.dataTable tbody tr:last-child td:last-child {
                    border-bottom-right-radius: ${r} !important;
                }               
            `;

            // If Outer Border is ON, adjust wrapper radius
            if (this.showOuterBorder) {
                customStyles += `
                    ${baseSelector} .dataTables_wrapper .dataTables_scrollHead {
                        border-top-left-radius: ${r} !important;
                        border-top-right-radius: ${r} !important;
                        border: 1px solid ${this.borderColor || '#dee2e6'};
                        border-bottom: none;
                        overflow: hidden; /* Ensure content clips to radius */
                    }
                    ${baseSelector} .dataTables_wrapper .dataTables_scrollBody {
                        border-top: none;
                    }
                 `;
            }
        }

        if (this.striped && this.rowStripedBackground) {
            customStyles += `
                ${baseSelector} table.dataTable.table-striped tbody tr.odd td,
                ${baseSelector} table.dataTable.table-striped tbody tr:nth-of-type(odd) td {
                    background-color: ${this.rowStripedBackground} !important;
                }
            `;
        }

        if (this.paginationTheme) {
            const theme = this.paginationTheme;
            const isOutline = theme.startsWith('outline-');
            const colorVar = isOutline ? `var(--bs-${theme.replace('outline-', '')})` : `var(--bs-${theme})`;

            customStyles += `
                /* Base page-link override for this container */
                /* background-color: ${isOutline ? 'transparent' : 'rgba(var(--bs-body-color-rgb), 0.03)'} !important; */
                ${baseSelector} .pagination .page-item .page-link {
                    color: ${colorVar} !important;
                    ${isOutline ? 'background-color: transparent !important;' : ''}
                    border-color: ${isOutline ? colorVar : 'var(--bs-border-color)'} !important;
                    transition: all 0.2s ease;
                }

                /* Active page-item override */
                ${baseSelector} .pagination .page-item.active .page-link,
                ${baseSelector} .pagination .page-item.active > .page-link {
                    background-color: ${isOutline ? 'transparent' : colorVar} !important;
                    border-color: ${colorVar} !important;
                    color: ${isOutline ? colorVar : '#ffffff'} !important;
                    ${isOutline ? 'border-width: 2px !important;' : 'font-weight: 600 !important;'}
                    z-index: 3;
                }

                /* Hover state override */
                ${baseSelector} .pagination .page-item .page-link:hover {
                    background-color: ${isOutline ? 'rgba(0,0,0,0.05)' : colorVar} !important;
                    border-color: ${colorVar} !important;
                    color: ${isOutline ? colorVar : '#ffffff'} !important;
                    z-index: 2;
                }
            `;
        }

        const styleTag = customStyles ? `<style>${customStyles}</style>` : '';


        let tableHTML = `
            ${styleTag}
            <table id="table-${this.containerId}" class="table ${this.striped ? 'table-striped' : ''} table-bordered dt-responsive nowrap ${this.clickableRows ? 'table-hover webrun-clickable-rows' : ''} ${alignClass}" style="width:100%">
                <thead>
                    <tr>
                        ${headerHTML}
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>`;

        // Store the filter HTML for later injection in initComplete
        this.generatedFilterHTML = filterHTML;

        // Render ONLY the table structure initially
        this.container.html(`
            ${tableHTML}
        `);


        // Initial height adjustment
        setTimeout(() => this.adjustTableHeight(), 100);

        this.bindCheckboxEvents();
    }

    bindCheckboxEvents() {
        const self = this;
        this.container.on('change', '.webrun-dt-select-all', function () {
            const isChecked = $(this).is(':checked');
            self.container.find('.webrun-dt-checkbox').prop('checked', isChecked);
        });

        if (!this.showHeader) {
            this.container.find('.dataTables_scrollHead').css('display', 'none');
            this.container.find('table thead').css('display', 'none');
        }

        // 3. Custom Button Column Click
        this.container.on('click', '.webrun-dt-custom-btn', function (e) {
            e.stopPropagation();
            const btn = $(this);
            const action = btn.data('action');
            const value = btn.data('value'); // The column value
            const rowIndex = btn.data('row-index');
            const rowData = self.dataTableInstance.row(rowIndex).data();

            // Execute onButtonClick callback if defined
            if (self.onButtonClick) {
                // Support arbitrary expression using _executeCallback
                self._executeCallback(self.onButtonClick, {
                    instance: self,
                    rowData: rowData,
                    action: action,
                    value: value
                });
            }
        });
    }

    // Business Logic Actions
    refreshData() {
        if (this.dataTableInstance) {
            this.stopAutoRefresh(); // Clear any pending timer

            this.dataTableInstance.ajax.reload(() => {
                //console.log(`Data refreshed for #${this.containerId}`);
                this.startAutoRefresh(); // Reschedule after successful update
            });
        }
    }

    startAutoRefresh() {
        if (this.datasetSource === 'server' && this.refreshInterval > 0) {
            this.stopAutoRefresh();
            this.refreshTimer = setTimeout(() => {
                this.refreshData();
            }, this.refreshInterval * 1000);
            //console.log(`Auto-refresh scheduled in ${this.refreshInterval}s for #${this.containerId}`);
        }
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    printTable() {
        window.print();
    }

    handleRowClick(rowData) {
        //console.log("Row Clicked:", rowData);
        alert(`Você clicou no pedido: ${rowData['S.L']} - Cliente: ${rowData['Name']}`);
    }

    // New API Methods
    clearData() {
        if (this.dataTableInstance) {
            this.dataTableInstance.clear().draw();
        }
    }

    getDataJSON() {
        // Return full dataset currently loaded (client-side)
        if (this.dataTableInstance) {
            return this.dataTableInstance.rows().data().toArray();
        }
        return [];
    }

    getDataByColumn(column, value) {
        if (this.dataTableInstance) {
            const data = this.dataTableInstance.rows().data().toArray();
            return data.filter(row => row[column] == value);
        }
        return [];
    }

    recreate() {
        if (this.dataTableInstance) {
            try {
                this.dataTableInstance.destroy();
            } catch (e) {
                console.warn("WebrunDataTable: Error during destroy in recreate", e);
            }
        }

        // Always try to re-init, even if dataTableInstance was already partially destroyed
        this.init();
    }

    destroy() {
        this.stopAutoRefresh();

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.dataTableInstance) {
            this.dataTableInstance.destroy();
            this.container.empty();
            const index = WebrunDataTable.instances.findIndex(i => i.containerId === this.containerId);
            if (index !== -1) WebrunDataTable.instances.splice(index, 1);
        }
    }

    adjustTableHeight() {
        if (!this.dataTableInstance) return;

        const containerHeight = this.container.height();
        // If container has 0 height (hidden), do nothing
        if (containerHeight === 0) return;
        // Skip height adjustment if scrollY is disabled (but NOT if forceFullHeight is enabled)
        if (this.disableScrollY && !this.forceFullHeight) return;

        // Calculate occupied space by headers, filters, pagination, etc.
        const wrapper = this.container.find('.dataTables_wrapper');
        const scrollHead = wrapper.find('.dataTables_scrollHead');
        const filterToolbar = this.container.find('.webrun-filters-toolbar');
        const dtInfo = wrapper.find('.dataTables_info');
        const dtPaginate = wrapper.find('.dataTables_paginate');

        let occupiedHeight = 0;
        if (scrollHead.length && scrollHead.is(':visible')) occupiedHeight += scrollHead.outerHeight(true);
        if (filterToolbar.length && filterToolbar.is(':visible')) occupiedHeight += filterToolbar.outerHeight(true);
        if (dtInfo.length && dtInfo.is(':visible')) occupiedHeight += dtInfo.outerHeight(true);
        if (dtPaginate.length && dtPaginate.is(':visible')) occupiedHeight += dtPaginate.outerHeight(true);

        // Add some buffer for margins/paddings
        occupiedHeight += 20;

        // Available height for scroll body
        const availableHeight = containerHeight - occupiedHeight;

        // Apply new height only if significantly different to avoid loops
        // Set a minimum height to avoid collapse
        const finalHeight = Math.max(availableHeight, 200);

        //console.log(`WebrunDataTable [${this.containerId}] adjustTableHeight: container=${containerHeight}px, occupied=${occupiedHeight}px, available=${availableHeight}px, final=${finalHeight}px`);

        // AUTO-FIT LOGIC: Update Page Length based on available height
        if (this.autoFitPageLength && this.dataTableInstance) {
            // Estimate row height (use user config or measure first visible row or default)
            let currentRowHeight = this.rowHeight;
            if (!currentRowHeight) {
                // Try to measure
                const visibleRows = this.dataTableInstance.rows({ key: 'tr', page: 'current' }).nodes().to$();
                if (visibleRows.length > 0) {
                    currentRowHeight = visibleRows.first().outerHeight();
                } else {
                    currentRowHeight = 40; // Fallback estimate
                }
            }

            if (currentRowHeight > 0) {
                // Calculate capacity
                const capacity = Math.floor(finalHeight / currentRowHeight);
                // Constrain to reasonable bounds
                const newLen = Math.max(1, capacity);

                if (this.dataTableInstance.page.len() !== newLen) {
                    //console.log(`WebrunDataTable: Auto-Fitting page length to ${newLen} (Height: ${finalHeight} / Row: ${currentRowHeight})`);
                    this.dataTableInstance.page.len(newLen).draw(false); // Draw without resetting paging? No, draw to apply.
                }
            }
        }

        const settings = this.dataTableInstance.settings()[0];
        if (settings) {
            // Directly update the scrollY setting and redraw
            settings.oScroll.sY = `${finalHeight}px`;

            try {
                this.dataTableInstance.columns.adjust(); // Just adjust columns, don't force redraw if not needed
                // Force height on scroll body to ensure it respects the setting immediately
                wrapper.find('.dataTables_scrollBody').css('max-height', `${finalHeight}px`).css('height', `${finalHeight}px`);
            } catch (e) {
                // Suppress errors when table isn't fully rendered (e.g., during rapid resize)
                console.warn('WebrunDataTable: Could not adjust columns (table may be hidden):', e.message);
            }
        }
    }

    toggleVisibility(state) {
        const currentlyHidden = this.container.is(':hidden');

        // If state is provided, use it (true = show, false = hide)
        if (typeof state !== 'undefined') {
            if (state === true) {
                this.container.show();
            } else if (state === false) {
                this.container.hide();
            }
        } else {
            // Toggle if no state provided
            this.container.toggle();
        }

        const isNowVisible = !this.container.is(':hidden');

        if (currentlyHidden && isNowVisible && this.dataTableInstance) {
            // When showing, we must adjust columns because DataTables 
            // can't calculate widths if the container was hidden.
            setTimeout(() => {
                this.dataTableInstance.columns.adjust().draw();
            }, 50);
        }
    }

    setColumnVisibility(columnName, visible) {
        if (this.dataTableInstance) {
            // Find index, ignoring checkbox columns if possible to avoid hiding the selection column
            // when it shares the name with a data column.
            let colIndex = this.columnsDefinition.findIndex(c => c.column === columnName && c.type !== 'checkbox');

            // Fallback: If no non-checkbox column found, try any column with that name
            if (colIndex === -1) {
                colIndex = this.columnsDefinition.findIndex(c => c.column === columnName);
            }

            if (colIndex !== -1) {
                this.dataTableInstance.column(colIndex).visible(visible);
                this.dataTableInstance.columns.adjust().draw(); // Force layout recalculation
            }
        }
    }

    clearAllFilters() {
        if (this.dataTableInstance) {
            this.container.find('.filter-input').val(''); // Clear UI inputs
            this.container.find('.filter-select').val(''); // Clear UI selects
            this.dataTableInstance.columns().search('').draw(); // Clear DT search
            this.dataTableInstance.search('').draw(); // Clear global search
        }
    }

    goToPage(pageIndex) {
        if (this.dataTableInstance) {
            this.dataTableInstance.page(pageIndex).draw('page');
        }
    }

    addRow(rowData) {
        if (!this.dataTableInstance) return;
        this.dataTableInstance.row.add(rowData).draw();
    }

    removeRow(column, value) {
        if (!this.dataTableInstance) return;
        const api = this.dataTableInstance;
        const row = api.rows().indexes().filter(idx => {
            const data = api.row(idx).data();
            return data && data[column] == value;
        });

        if (row.length > 0) {
            api.row(row[0]).remove().draw();
        }
    }

    updateSqlQuery(query) {
        this.sqlQuery = query;
        this.datasetSource = 'server';
        this.recreate();
    }

    loadJSON(data) {
        this.dataJSON = typeof data === 'string' ? data : JSON.stringify(data);
        this.datasetSource = 'client';
        this.serverSide = false;
        this.recreate();
    }

    getCurrentPage() {
        return this.dataTableInstance ? this.dataTableInstance.page() : 0;
    }

    getTotalPages() {
        return this.dataTableInstance ? this.dataTableInstance.page.info().pages : 0;
    }

    getTotalRecords() {
        return this.dataTableInstance ? this.dataTableInstance.page.info().recordsTotal : 0;
    }

    getColumnsJSON() {
        return this.columnsDefinition;
    }

    getHiddenColumnsJSON() {
        if (!this.dataTableInstance) return [];
        return this.columnsDefinition.filter((c, i) => !this.dataTableInstance.column(i).visible());
    }



    filterBy(columnName, val1, val2) {
        if (this.dataTableInstance) {
            const colIndex = this.columnsDefinition.findIndex(c => c.column === columnName);
            if (colIndex === -1) return;

            const filterInput = this.container.find(`input[data-column="${columnName}"], select[data-column="${columnName}"]`);

            if (filterInput.length > 0) {
                if (val2 !== undefined) {
                    // Range filter
                    this.container.find(`input[data-column="${columnName}"][data-type="min"]`).val(val1);
                    this.container.find(`input[data-column="${columnName}"][data-type="max"]`).val(val2);
                } else {
                    filterInput.val(val1);
                }
                filterInput.trigger('change');
            } else {
                // Manual DT filter if no UI input found
                this.dataTableInstance.column(colIndex).search(val1).draw();
            }
        }
    }

    searchGlobal(query) {
        if (this.dataTableInstance) {
            this.dataTableInstance.search(query).draw();
        }
    }

    setRowsPerPage(len) {
        if (this.dataTableInstance) {
            this.dataTableInstance.page.len(len).draw();
        }
    }

    initDataTable() {
        // Initialize DataTables
        let dtColumns = [];
        if (this.columnsDefinition.length > 0) {
            dtColumns = this.columnsDefinition.map(col => {
                const config = {
                    title: col.label || col.column,
                    name: col.column,
                    data: (row) => row[col.column] // Handle literal keys with dots (like "S.L")
                };

                if (col.type === 'checkbox') {
                    // Checkbox Column
                    config.title = '<div class="form-check d-flex justify-content-center"><input class="form-check-input webrun-dt-select-all" type="checkbox" style="cursor: pointer;"></div>';
                    config.orderable = false;
                    config.className = 'text-center webrun-dt-checkbox-col';
                    config.render = (data, type, row) => {
                        // Use a unique ID if available, otherwise index (less robust) or just nothing (rely on row selection)
                        return `<div class="form-check d-flex justify-content-center"><input class="form-check-input webrun-dt-checkbox" type="checkbox" value="${data || ''}" style="cursor: pointer;"></div>`;
                    };
                } else if (col.type === 'button') {
                    // Single Custom Button Column
                    config.orderable = false;
                    config.className = 'text-center webrun-dt-button-col';
                    config.render = (data, type, row, meta) => {
                        const btnType = col.buttonType || 'primary';
                        const isTransparent = btnType === 'transparent';
                        const btnClass = isTransparent ? 'btn-transparent' : `btn-${btnType}`;

                        let iconClass = col.buttonIcon || '';

                        // Auto-fix for FontAwesome: if it starts with 'fa-' but doesn't have 'fa ' prefix
                        if (iconClass && iconClass.startsWith('fa-') && !iconClass.includes('fa ')) {
                            iconClass = `fa ${iconClass}`;
                        }

                        const icon = iconClass ? `<i class="${iconClass}"></i>` : '';
                        const label = col.name || '';
                        const action = col.action || '';

                        // We store the value (data) and action in attributes
                        const valueStr = data !== undefined && data !== null ? String(data).replace(/"/g, '&quot;') : '';

                        // Add margin to label if icon exists
                        const labelHtml = (icon && label) ? `<span class="ms-1">${label}</span>` : label;

                        return `
                             <button type="button" class="btn ${btnClass} btn-sm webrun-dt-custom-btn"
                                data-action="${action}"
                                data-value="${valueStr}"
                                data-row-index="${meta.row}">
                                ${icon}${labelHtml}
                             </button>
                        `;
                    };
                } else if (col.type === 'group-button') {
                    // Group Button Column
                    config.orderable = false;
                    config.className = 'text-center webrun-dt-group-btn-col';
                    config.render = (data, type, row, meta) => {
                        // Arrays of properties
                        const names = Array.isArray(col.name) ? col.name : [col.name];
                        const types = Array.isArray(col.buttonType) ? col.buttonType : [col.buttonType];
                        const icons = Array.isArray(col.buttonIcon) ? col.buttonIcon : [col.buttonIcon];
                        const actions = Array.isArray(col.action) ? col.action : [col.action];

                        const valueStr = data !== undefined && data !== null ? String(data).replace(/"/g, '&quot;') : '';

                        // Determine the length of the group based on the longest array provided
                        const count = Math.max(names.length, types.length, icons.length, actions.length);

                        let html = '<div class="btn-group btn-group-sm" role="group">';

                        for (let i = 0; i < count; i++) {
                            const btnLabel = names[i] || ''; // Used for tooltip
                            const btnType = types[i] || 'secondary';
                            const isTransparent = btnType === 'transparent';
                            const btnClass = isTransparent ? 'btn-transparent' : `btn-${btnType}`;
                            const btnAction = actions[i] || '';

                            let iconClass = icons[i] || '';
                            // Auto-fix for FontAwesome
                            if (iconClass && iconClass.startsWith('fa-') && !iconClass.includes('fa ')) {
                                iconClass = `fa ${iconClass}`;
                            }
                            const iconHtml = iconClass ? `<i class="${iconClass}"></i>` : btnLabel; // Fallback to label if no icon

                            // Style Note: To match the "soft" look in the image, we might need custom CSS.
                            // For now, using standard bootstrap classes but adding 'webrun-dt-custom-btn' for event handling

                            html += `
                                  <button type="button" class="btn ${btnClass} webrun-dt-custom-btn mx-1" 
                                      style="border-radius: 4px;"
                                      data-action="${btnAction}"
                                      data-value="${valueStr}"
                                      data-row-index="${meta.row}"
                                      title="${btnLabel}"
                                      data-bs-toggle="tooltip">
                                      ${iconHtml}
                                  </button>
                              `;
                        }

                        html += '</div>';
                        return html;
                    };
                } else if (col.type === 'date') {
                    config.render = (data) => {
                        if (!data) return '';

                        // Robust Local Date Parser to avoid timezone shifts (Brazil UTC-3 issue)
                        let date;
                        if (typeof data === 'string') {
                            const isoMatch = data.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
                            if (isoMatch) {
                                date = new Date(
                                    parseInt(isoMatch[1]),
                                    parseInt(isoMatch[2]) - 1,
                                    parseInt(isoMatch[3]),
                                    isoMatch[4] ? parseInt(isoMatch[4]) : 0,
                                    isoMatch[5] ? parseInt(isoMatch[5]) : 0,
                                    isoMatch[6] ? parseInt(isoMatch[6]) : 0
                                );
                            } else {
                                date = new Date(data);
                            }
                        } else {
                            date = new Date(data);
                        }

                        if (isNaN(date.getTime())) return data;

                        if (col.format) {
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();

                            // Check if time components exist (non-zero) or if they should be included
                            const hours = date.getHours();
                            const minutes = date.getMinutes();
                            const seconds = date.getSeconds();
                            const timeStr = (hours !== 0 || minutes !== 0 || seconds !== 0)
                                ? ` ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                                : '';

                            switch (col.format.toLowerCase()) {
                                case 'dmy': return `${day}/${month}/${year}${timeStr}`;
                                case 'mdy': return `${month}/${day}/${year}${timeStr}`;
                                case 'ymd': return `${year}-${month}-${day}${timeStr}`;
                                default: return this.dateFormatter.format(date);
                            }
                        }

                        return this.dateFormatter.format(date);
                    };
                } else if (col.type === 'numeric' || col.type === 'money' || col.type === 'number') {
                    config.render = (data) => {
                        let val = parseFloat(data);
                        if (isNaN(val)) return data;

                        if (col.type === 'money' && !col.format) {
                            return this.numberFormatter.format(val);
                        }

                        if (col.format) {
                            // Simple String.format/printf style implementation for numeric
                            // Matches something like "R$ %.2f" or "%.2f"
                            let formatted = col.format;
                            const match = col.format.match(/%\.(\d+)f/);
                            if (match) {
                                const precision = parseInt(match[1]);
                                const fixedVal = val.toFixed(precision);

                                // Apply locale-aware punctuation to the fixed string
                                const parts = fixedVal.split('.');
                                const integerPart = parseInt(parts[0]).toLocaleString(this.dataLocale.replace('_', '-'));
                                const decimalPart = parts[1];

                                // Get locale decimal separator
                                const decimalSeparator = (1.1).toLocaleString(this.dataLocale.replace('_', '-')).substring(1, 2);
                                const localizedVal = decimalPart !== undefined ? integerPart + decimalSeparator + decimalPart : integerPart;

                                formatted = col.format.replace(match[0], localizedVal);
                            } else {
                                formatted = val.toLocaleString(this.dataLocale.replace('_', '-'));
                            }
                            return formatted;
                        }

                        return val.toLocaleString(this.dataLocale.replace('_', '-'));
                    };
                } else if (col.type === 'int') {
                    config.render = (data) => {
                        const val = parseInt(data);
                        return isNaN(val) ? data : val.toString();
                    };
                } else if (col.type === 'image') {
                    config.render = (data) => {
                        if (!data) return '<div class="text-muted small">Sem Foto</div>';

                        // Handle 'circle' format or other custom styles
                        let style = 'max-height: 50px;';
                        if (col.format === 'circle') {
                            style = 'width: 40px; height: 40px; border-radius: 50%; object-fit: cover;';
                        }

                        return `<img src="${data}" class="img-thumbnail webrun-dt-image" 
                                     style="${style}" 
                                     onerror="this.onerror=null;this.src='https://placehold.co/50x50?text=Error';">`;
                    };
                    config.orderable = false; // Usually we don't sort by images
                    config.className = 'text-center'; // Center the image
                } else if (typeof col.render === 'string') {
                    // Custom HTML render with template variables ${columnName}
                    config.render = (data, type, row) => {
                        let html = col.render;
                        // Replace ${key} with row[key]
                        return html.replace(/\${([^}]+)}/g, (match, key) => {
                            return row[key] !== undefined ? row[key] : '';
                        });
                    };
                }

                // Apply explicit alignment if provided (v-align is handled globally by verticalAlignment)
                if (col.align) {
                    const alignmentMap = {
                        'left': 'text-start',
                        'center': 'text-center',
                        'right': 'text-end'
                    };
                    config.className = alignmentMap[col.align] || col.align;
                }

                // Initial visibility
                if (col.show === false) {
                    config.visible = false;
                }

                // Explicit Width
                if (col.size) {
                    config.width = col.size;
                }

                return config;
            });
        } /*else {
            // Default fallback columns
            dtColumns = [
                { title: "Name", name: "Name", data: 0 },
                { title: "Position", name: "Position", data: 1 },
                { title: "Office", name: "Office", data: 2 },
                { title: "Age", name: "Age", data: 3 },
                {
                    title: "Start date",
                    name: "Start date",
                    data: 4,
                    render: (data) => {
                        if (!data) return '';
                        const date = new Date(data);
                        return isNaN(date.getTime()) ? data : this.dateFormatter.format(date);
                    }
                },
                {
                    title: "Salary",
                    name: "Salary",
                    data: 5,
                    render: (data) => {
                        return typeof data === 'number' ? this.numberFormatter.format(data) : data;
                    }
                }
            ];
        }*/

        // Calculate available height for scrollY
        const containerHeight = this.container.height();
        let scrollYVal = '400px'; // Default fallback

        if (containerHeight && containerHeight > 200) {
            // Subtract estimated height of:
            // - Filter/Length bar (~50px)
            // - Table Header (~40px)
            // - Pagination/Info (~50px)
            // - Padding (~20px)
            scrollYVal = (containerHeight - 120) + "px";
        }

        // Dynamically build lengthMenu to include the selected pageLength, respecting pageLengthMax
        let menuValues = [10, 25, 50, 100];
        menuValues = menuValues.filter(v => v <= this.pageLengthMax);
        if (!menuValues.includes(this.pageLength)) {
            menuValues.push(this.pageLength);
            menuValues.sort((a, b) => a - b);
        }
        menuValues = menuValues.filter(v => v <= this.pageLengthMax);

        const dtOptions = {
            language: {
                ...this.getLanguage(),
                search: "_INPUT_",
                searchPlaceholder: "Pesquisar..."
            },
            columns: dtColumns,
            paging: this.showPagination,
            ordering: this.showOrdering,
            autoWidth: false, // Prevent DataTables from hardcoding column widths
            lengthChange: this.showLength,
            lengthMenu: [menuValues, menuValues],
            searching: this.showSearch,
            info: this.showInfo,
            pageLength: this.pageLength,
            responsive: this.responsive,
            order: [], // Disable initial sort
            // Only set scrollY if not disabled
            scrollY: this.disableScrollY ? null : scrollYVal,
            scrollX: true,
            // scrollCollapse: If forceFullHeight is true (special mode), scrollCollapse must be FALSE to force filler space.
            // Otherwise, typically TRUE (!disableScrollY) to shrink-to-fit content.
            scrollCollapse: this.forceFullHeight ? false : !this.disableScrollY,
            processing: this.processing,
            serverSide: this.serverSide,
            fixedHeader: false,
            initComplete: (settings, json) => {
                //console.log(`WebrunDataTable [${this.containerId}] initComplete fired.`);

                // Inject Filters if they exist
                if (this.generatedFilterHTML) {
                    const wrapper = this.container.find('.dataTables_wrapper');

                    if (this.filterPosition === 'top') {
                        // Inject ABOVE the wrapper (container prepend)
                        // User Request: "assume 100% largura e tem um espaçamento para ficar mais elegante"
                        const filterObj = $(this.generatedFilterHTML);
                        filterObj.css('width', '100%').addClass('mb-2'); // Full width + margin bottom
                        this.container.prepend(filterObj);
                        // Setup listeners
                        setTimeout(() => {
                            this.setupFilterListeners();
                        }, 50);
                    } else {
                        // Default: 'inside' - Inject into the top row of the wrapper
                        const topRow = wrapper.children().first();
                        const targetSection = topRow.children().first(); // The left section (Length + Filters)

                        if (targetSection.length > 0) {
                            // Apply Flexbox to the container to align Length and Filters side-by-side
                            // RESIZE LOGIC: Force col-md-9 on this section, and col-md-3 on the next (search/buttons)
                            targetSection.removeClass('col-md-6').addClass('col-md-9');
                            const nextSection = targetSection.next();
                            if (nextSection.length > 0) {
                                nextSection.removeClass('col-md-6').addClass('col-md-3');
                            }

                            // Ensure flex container behavior
                            targetSection.addClass('d-flex align-items-center flex-wrap gap-3');

                            const lengthControl = targetSection.find('.dataTables_length');
                            if (lengthControl.length > 0) {
                                lengthControl.after(this.generatedFilterHTML);
                            } else {
                                targetSection.append(this.generatedFilterHTML);
                            }
                            //console.log(`WebrunDataTable: Injected filters into wrapper.`);

                            // Setup listeners NOW that elements are in DOM
                            setTimeout(() => {
                                this.setupFilterListeners();
                            }, 50);
                        } else {
                            // Fallback if structure is unexpected
                            wrapper.prepend(this.generatedFilterHTML);
                            this.setupFilterListeners();
                        }
                    }
                }

                this.renderActionMainButton();
                this.container.css('opacity', 1);
            },

            drawCallback: (settings) => {
                const api = new $.fn.dataTable.Api(settings);

                // Determine the trigger
                let trigger = 'unknown';
                const currentSearch = api.search();
                const currentOrder = JSON.stringify(api.order());
                const currentPage = api.page();

                // If it's the very first draw or data source change
                if ((settings._iDisplayStart === 0 && settings.iDraw <= 2 && !this.lastState.search && !this.lastState.order.length) || settings.bDestroying) {
                    // Note: DataTables initial draw count varies, check context
                    if (settings.iDraw === 1) trigger = 'initial';
                    else trigger = 'refresh';
                }

                // Logic to differentiate triggers
                if (settings.iDraw === 1) {
                    trigger = 'initial';
                } else if (currentSearch !== this.lastState.search) {
                    trigger = 'search';
                } else if (currentOrder !== JSON.stringify(this.lastState.order)) {
                    trigger = 'order';
                } else if (currentPage !== this.lastState.page) {
                    trigger = 'page';
                } else {
                    trigger = 'refresh';
                }

                // Sync state for next draw
                this.lastState = {
                    search: currentSearch,
                    order: api.order(),
                    page: currentPage
                };

                // Trigger onAfterLoad event if defined
                if (this.onAfterLoad && typeof this.onAfterLoad === 'string') {
                    this._executeCallback(this.onAfterLoad, { instance: this, trigger: trigger });
                }

                // Trigger resize to fix alignment after data load
                setTimeout(() => {
                    api.columns.adjust();
                }, 50);
            }
        };

        // Apply disableScrollY override
        if (this.disableScrollY) {
            dtOptions.scrollY = null;
            dtOptions.scrollCollapse = false;
        }

        if (this.datasetSource === 'server') {

            if (this.env === 'dev') {
                dtOptions.ajax = {
                    url: "http://localhost:8049/webrun5/datatableresultdev.rule?sys=CMP",
                    type: "POST",
                    contentType: 'application/json;',
                    xhrFields: {
                        withCredentials: true
                    },
                    data: (d) => {
                        const params = {
                            ...d,
                            sql: this.sqlQuery
                        };

                        // Automatically append WAuthToken if available (Common in Webrun/Platform)
                        if (window.WAuthToken) params.WAuthToken = window.WAuthToken;
                        else if (window.parent && window.parent.WAuthToken) params.WAuthToken = window.parent.WAuthToken;

                        return params;
                    },
                    dataSrc: (json) => {
                        if (json && json.data) return json.data;
                        return json || []; // Fallback to empty array if null
                    },
                    error: (xhr, error, thrown) => {
                        console.error("DataTable Ajax Error Details:", {
                            status: xhr.status,
                            statusText: xhr.statusText,
                            responseText: xhr.responseText,
                            error: error,
                            thrown: thrown
                        });

                        if (xhr.status === 403) {
                            alert("Erro 403 (Proibido): Verifique se a sua sessão expirou ou se é necessário um Token de Segurança (CSRF).");
                        }
                    }
                };
            } else {
                // PROD Mode - use executeSyncJavaRule
                dtOptions.ajax = (data, callback, settings) => {
                    try {
                        var ruleName = 'datatableresult';
                        var params = [this.sqlQuery, this.dbSource, JSON.stringify(data)];
                        var response = executeSyncJavaRule(this.sysCode, this.formCode, ruleName, params);

                        // Parse if returned as string, otherwise assume object
                        var json = typeof response === 'string' ? JSON.parse(response) : response;

                        callback({
                            data: json.data || json,
                            recordsTotal: json.recordsTotal,
                            recordsFiltered: json.recordsFiltered,
                            draw: json.draw
                        });
                    } catch (e) {
                        console.error("WebrunDataTable: Error in executeSyncJavaRule", e);
                        callback({ data: [] });
                    }
                };
            }
        } else {
            // Client-side data from dataJSON attribute
            let clientData = [];
            if (this.dataJSON) {
                try {
                    clientData = typeof this.dataJSON === 'string' ? JSON.parse(this.dataJSON) : this.dataJSON;
                } catch (e) {
                    console.error("WebrunDataTable: Error parsing dataJSON", e);
                }
            }
            dtOptions.data = clientData;
        }

        const table = $(`#table-${this.containerId}`).DataTable(dtOptions);

        this.dataTableInstance = table;

        // Handle Row Clicks
        if (this.clickableRows) {
            const self = this;
            $(`#table-${this.containerId} tbody`).on('click', 'tr', function (e) {
                // Prevent row click if clicking on a button, checkbox, input, or link
                if ($(e.target).closest('button, input, a, .webrun-dt-custom-btn, .webrun-dt-checkbox').length > 0) {
                    return;
                }

                const rowData = table.row(this).data();
                if (self.onRowClick) {
                    self._executeCallback(self.onRowClick, { instance: self, rowData: rowData });
                }
            });
        }

        // Handle Checkbox Clicks (Custom Event)
        if (this.onCheckboxClick) {
            const self = this;

            // Header Checkbox (Select All)
            $(`#table-${this.containerId} thead`).on('click', '.webrun-dt-select-all', function (e) {
                e.stopPropagation();
                const checked = $(this).prop('checked');
                // Execute callback
                if (self.onCheckboxClick) {
                    self._executeCallback(self.onCheckboxClick, { instance: self, state: checked, value: 'select-all' });
                }
            });

            // Row Checkbox
            $(`#table-${this.containerId} tbody`).on('click', '.webrun-dt-checkbox', function (e) {
                e.stopPropagation();
                const checked = $(this).prop('checked');
                const value = $(this).val();

                if (self.onCheckboxClick) {
                    self._executeCallback(self.onCheckboxClick, { instance: self, state: checked, value: value });
                }
            });
        }

        // this.renderActionMainButton(); // Moved to initComplete
    }

    setupFilterListeners() {
        const self = this;
        const api = this.dataTableInstance;

        // Custom search function for range filters
        $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
            if (settings.nTable.id !== `table-${this.containerId}`) return true;

            let result = true;
            this.filters.forEach(f => {
                if (f.type === 'select') return; // Handled by api.column().search()

                const colIdx = api.column(`${f.column}:name`).index();
                const rawData = api.row(dataIndex).data()[f.column]; // Use key for direct access

                const colId = f.column.replace(/\s+/g, '-').toLowerCase();

                if (f.type === 'number-range') {
                    const min = parseFloat($(`#filter-${this.containerId}-${colId}-min`).val());
                    const max = parseFloat($(`#filter-${this.containerId}-${colId}-max`).val());
                    const val = parseFloat(rawData);

                    if (!((isNaN(min) || val >= min) && (isNaN(max) || val <= max))) {
                        result = false;
                    }
                } else if (f.type === 'date-range') {
                    const start = $(`#filter-${this.containerId}-${colId}-start`).val();
                    const end = $(`#filter-${this.containerId}-${colId}-end`).val();
                    const val = rawData;

                    if (!((!start || val >= start) && (!end || val <= end))) {
                        result = false;
                    }
                }
            });

            return result;
        });

        // Listen to inputs for drawing
        $(`#filters-${this.containerId} input`).on('keyup change', () => api.draw());

        // Select population logic
        const populateSelects = () => {
            this.filters.forEach(f => {
                if (f.type !== 'select') return;

                const colId = f.column.replace(/\s+/g, '-').toLowerCase();
                const select = $(`#filter-${this.containerId}-${colId}`);
                const colIdx = api.column(`${f.column}:name`).index();

                if (colIdx === undefined) return;

                const currentVal = select.val();
                select.find('option:not(:first)').remove(); // Keep "Todos"

                api.column(colIdx).data().unique().sort().each(d => {
                    if (d !== null && d !== undefined && d !== "") {
                        select.append(`<option value="${d}" ${d == currentVal ? 'selected' : ''}>${d}</option>`);
                    }
                });
            });
        };

        // Attach listeners for select filters
        this.filters.forEach(f => {
            if (f.type !== 'select') return;
            const colId = f.column.replace(/\s+/g, '-').toLowerCase();
            const colIdx = api.column(`${f.column}:name`).index();

            $(`#filter-${this.containerId}-${colId}`).on('change', function () {
                const val = $(this).val();
                api.column(colIdx).search(val ? `^${$.fn.dataTable.util.escapeRegex(val)}$` : '', true, false).draw();
            });
        });

        // Populate selects on initial load and after every draw (to catch Ajax updates)
        api.on('draw', populateSelects);
        if (this.datasetSource !== 'server' || !this.serverSide) {
            populateSelects(); // Initial call for client-side
        }
    }

    loadTheme(themeName) {
        // Determine filename: datatables_default.css or datatables_[name].css
        //console.log(themeName);
        const fileName = themeName ? `datatables_${themeName}.css` : 'datatables_default.css';
        const linkId = `webrun-dt-theme-${themeName || 'default'}`;

        // Check if already loaded
        if (document.getElementById(linkId)) return;

        // Base path
        const path = `assets/dataTablesAssets/${fileName}`;

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = path;
        link.media = 'all';

        document.head.appendChild(link);
        //console.log(`WebrunDataTable: Loaded theme '${path}'`);
    }


    renderActionMainButton() {
        if (!this.actionMainButton) return;

        const config = this.actionMainButton;
        const btnType = config.buttonType || 'primary';
        let iconClass = config.buttonIcon || '';
        const label = config.name || 'New Action';
        const action = config.action || 'new'; // Action identifier

        // Auto-fix for FontAwesome prefixes
        if (iconClass && iconClass.startsWith('fa-') && !iconClass.includes('fa ')) {
            iconClass = `fa ${iconClass}`;
        }

        const wrapperSelector = `#table-${this.containerId}_wrapper`;
        const wrapper = this.container.find('.dataTables_wrapper');

        // Logic: Find first row, then second column
        let columnContainer = wrapper.children().first().children().eq(1);
        let targetContainer = columnContainer;

        // Check if filter exists inside this column (preferred for strict alignment)
        const filter = columnContainer.find('.dataTables_filter');
        if (filter.length > 0) {
            targetContainer = filter;
            //console.log(`WebrunDataTable: Found .dataTables_filter inside column, using it for alignment.`);
        } else {
            //console.log(`WebrunDataTable: .dataTables_filter not found in column, using column itself.`);
        }

        /*console.log(`WebrunDataTable [${this.containerId}] ActionButton Target Check (Traversal):`, 
        {
        wrapperLength: wrapper.length,
            targetLength: targetContainer.length,
                isFilter: targetContainer.hasClass('dataTables_filter')
    });*/

        if (targetContainer.length === 0) {
            console.warn(`WebrunDataTable: Target container not found via traversal. Falling back to .dataTables_filter lookup.`);
            // Fallback for different layouts
            targetContainer = this.container.find('.dataTables_filter');
            if (targetContainer.length === 0) {
                targetContainer = this.container.find('.dataTables_length');
            }
        }

        // If still no target, create a toolbar
        if (targetContainer.length === 0) {
            //console.log("WebrunDataTable: Creating custom toolbar for ActionButton");
            const wrapper = this.container.find('.dataTables_wrapper');
            if (this.container.find('.webrun-dt-custom-toolbar').length === 0) {
                wrapper.prepend('<div class="webrun-dt-custom-toolbar d-flex justify-content-end mb-2"></div>');
            }
            targetContainer = this.container.find('.webrun-dt-custom-toolbar');
        }

        // Ensure proper alignment
        targetContainer.addClass('d-flex align-items-center justify-content-end gap-2');

        // Remove margin from label to fix vertical offsets
        targetContainer.find('label').addClass('m-0');

        const btnHtml = `
            <button type="button" class="btn btn-${btnType} btn-sm webrun-dt-action-main-btn ms-0"
                data-action="${action}">
                ${iconClass ? `<i class="${iconClass} me-1"></i>` : ''}${label}
            </button>
        `;

        // Avoid adding duplicate
        if (targetContainer.find('.webrun-dt-action-main-btn').length === 0) {
            targetContainer.append(btnHtml);
            //console.log(`WebrunDataTable: ActionButton appended to`, targetContainer);

            // Bind Click Event
            targetContainer.find('.webrun-dt-action-main-btn').on('click', (e) => {
                e.stopPropagation();

                if (this.onButtonClick) {
                    this._executeCallback(this.onButtonClick, {
                        instance: this,
                        rowData: {}, // No specific row for global action
                        action: action,
                        value: null
                    });
                }
            });
        }
    }
}
