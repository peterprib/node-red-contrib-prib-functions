# [node-red-contrib-prib-functions][2]

[Node-Red][1] nodes for various functions:

*   Data Analysis  - statistical metrics that has real time option
*   Matrix
*   Transform
*   Test
*   Load Injector
*   Monitor Flow
*   append
*   Spawn Process
*   Host Available
*   node.js os metrics
*   Levenshtein Distance

------------------------------------------------------------

## Data Analysis

Real time metrics which are recalculated on single of data point and posted in msg.result.
Key and value can be selected from msg.payload. Includes lag (seasonal) along with delta(defference).
Sending message with topic"@stats" places message with all stats on second port.
If realtime metrics then a third port is shown where the message is sent if it is an outlier
being outside 3 standard deviations from mean. This can be changed to median and number of deviations.

![Data Analysis Realtime](documentation/DataAnalysisRealtime.JPG "Data Analysis Realtime")
![Data Analysis Pearson R](documentation/DataAnalysisPearsonR.JPG "Data Analysis Pearson R")

A set of data analysis functions that can be run over an array of data

Single value metrics:
* autocorrelation
* Autocovariance
* Average/Mean
* Maximum
* Median
* Minimum
* Range
* Standard Deviation
* Skewness
* Sum
* Variance

Array metrics:
* Deltas
* Deltas Normalised
* difference
* difference seasonal
* difference seasonal second order
* Moving Average Simple (SMA)
* Moving Average Cumulative (CMA)
* Moving Average Weighted (WMA)
* Moving Average Exponential (EMA/EWMA)
* Normalise
* Standardization (Z-score Normalization)

Array data
* distances 
* distance(s) minimum between points
* distance(s) maximum between points


![Data Analysis](documentation/DataAnalysis.JPG "Data Analysis")

example:

![Data Analysis Realtime example](documentation/DataAnalysisTestRealtime.JPG "Data Analysis Realtime example")

![Data Analysis Pearson R example](documentation/DataAnalysisTestPearsonR.JPG "Data Analysis PearsonR example")


![Data Analysis example](documentation/DataAnalysisTest.JPG "Data Analysis example")


------------------------------------------------------------

## Matrix

Define a matrix and perform various functions

 * Define / Define Empty / Create / Create Like/ clone
 * Add / Add Row to Row / Add to Cell / Add Row / Subtract Cell
 * Multiple / Multiple Cell / Divide Cell / Divide Row
 * Transpose
 * Adjoint
 * Cofactor
 * Complement Minor
 * Identity
 * Inverse
 * Determinant
 * Backward Substitution
 * Forward Elimination
 * Gaussian Elimination
 * Reduced Row EchelonForm
 * Row Echelon Form
 * Nearly Equals / Is Square / Get Cell
 * Sum Row
 * Swap Rows
 * To Array Object


![Matrix](documentation/matrix.jpg "Matrix")

------------------------------------------------------------

## Transform

Translates a selected msg property to a target property.
Messages generates a message for each row or record. 

Transformations:

*   Array to
    * CSV
    * HTML
    * ISO8385
    * Messages
    * xlsx / xlsx object (excel uses [xlsx][7])  
*   AVRO to JSON (uses [avsc][6])
*   Buffer to compressed 
*   Confluence to JSON
*   Compressed to
    * Buffer
    * String
    * JSON
*   CSV to
    * Array
    * HTML
    * Messages
*   CSVWithHeader to
    * Array
    * HTML
    * JSON
*   Date to
    * is between
    * ISO string 
    * locale string
    * range limit
*   ISO8385 to Array
*   ISO8385 to JSON
*   JSON to 
    * Array
    * Confluence
    * CSV
    * AVRO (uses [avsc][6])
    * ISO8385
    * Messages
    * String
    * xlsx / xlsx object (excel uses [xlsx][7])  
    * XML (uses [fast-xml-parser][4])
* Number
    * is between
    * range limit
*   path
    * Basename
    * Dirname
    * Extname
    * Format
    * Is Absolute
    * Join
    * Parse
    * Normalize
    * Resolve
*   snappy compress (uses [snappy][5], must install separately)
*   snappy uncompress (uses [snappy][5], must install separately)
*   String to
    * Append
    * Array By Delimiter
    * At
    * Camelize
    * Capitalize
    * Compressed
    * Char At
    * Char Code At"
    * Code Point At
    * Concat
    * Date
    * Delimiter On Case
    * _ to space
    * _ to space Capitilize
    * Drop square bracket prefix
    * Ends With
    * Float
    * Get Word
    * Integer
    * is Between
    * Lower Case
    * Number
    * Prepend
    * JSON
    * Range Limit
    * Split
    * Starts With
    * Timestamp
    * Title
    * Title Grammatical
    * Trim
    * Trim End
    * Trim Start
    * Upper Case
    * Xml String Encode


*   xlsx / xlsx object to array/JSON (excel uses [xlsx][7])  
*   XML to JSON (uses [fast-xml-parser][4])

Note, snappy needs to be installed separately as can have issues with auto install as build binaries.

With xlsx object one can use the function in [xlsx][7] against the object in functions node.
"
Example AVRO with schema

![Transform AVRO](documentation/transformArvo.jpg "Transform AVRO example")

For Confluence schema contains a list of schemas in form {"<schema id>",<schema>}

------------------------------------------------------------

## Test

Allows a test case for a message to allow simple testing of nodes. Injects a new message via mouse or message. Message sent to first port which can be consumed by other nodes and returned back to node in a loop. The Test node then checks against detailed expected payload result. 

![Test](documentation/Test.JPG "Test")

example:

![Test example](documentation/TestTest.JPG "Test example")

after run

![Test example run](documentation/TestTestRun.JPG "Test example run")

------------------------------------------------------------

## append

Append file(s) to payload. Cached to maximise performance.
Require can be used to find file.

![append](documentation/append.JPG "append")

Test example:

![append example](documentation/appendTest.JPG "append example")

------------------------------------------------------------

## Levenshtein Distance

The levenshtein distance between two character strings.

![Levenshtein Distance](documentation/levenshteinDistance.jpg "Levenshtein Distance")

------------------------------------------------------------

## Load Injector

Inject messages for a set period of time with varying think time.
Primary purpose is testing and useful for load/stress testing.

Has 3 extra data types
1. generated id - Unique id for each message
2. generated data - string text generated using [dummy-json][3]
3. generated json - json generated using [dummy-json][3]


![Load Injector](documentation/loadInjector.png "Load Injector")

Test example:

![Load Injector example](documentation/LoadInjectorTest.JPG "Load Injector example")

------------------------------------------------------------

## Monitor Flow

Add on wire between two flows to see message rates in status line.
Rate sampled every second and provides rate last second / 10 seconds / 1 minute / 5 minutes.

![Monitor Flow](documentation/MonitorFlow.JPG "Monitor Flow")

Test example:

![Monitor Flow example](documentation/MonitorFlowTest.JPG "Monitor Flow example")

------------------------------------------------------------

## Host Available

Test if host is available sending msg to up or down port so action can be taken.
Message only sent on state change or if message is sent which doesn't have topic refreshHostAvailable.
This topic forces a check rather than time check which can be set.

![Host Available](documentation/hostAvailable.JPG "Host Available")

Test example:

![Host Available example](documentation/hostAvailableTest.JPG "Host Available example")

------------------------------------------------------------

## Monitor System 

System monitoring metrics

![Monitor System](documentation/monitorSystem.JPG "Monitor System")

Test example:

![Monitor System example](documentation/monitorSystemTest.JPG "Monitor System example")

------------------------------------------------------------

## os

The metrics from node.js os

![os](documentation/os.JPG "os")

Test example:

![os example](documentation/osTest.JPG "os example")

------------------------------------------------------------

## Spawn Process

Spawn process as per node.js manual with ability to set working directory, environment variables
and argument passed to process. STDOUT and STDERR are sent as individual messages.
RC port is sent a message on closure.
Takes in messages that starts a process with ability to add environment values.
Message can be sent to kill the process.    

![Spawn Process](documentation/SpawnProcess.JPG "Spawn Process")

Test example:

![Spawn Process example](documentation/SpawnProcessTest.JPG "Spawn Process example")

------------------------------------------------------------

# Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-prib-functions

# Tests

Test/example flow in test/generalTest.json

------------------------------------------------------------

# Version
0.23.0 Removes bug in test, more translation

0.22.0 Add autocovariance + autocorealationship to real time data analystics, improves test

0.21.0 Add lag/seasonal to real time data analystics

0.20.3 Add difference + monitor system

0.19.0 Improve load injector, fix bug in test comparing buffers, add compression tranforms

0.18.0 Add matrix node

0.17.0 Add finished wire to load injector


# Author

[Peter Prib][3]

[1]: http://nodered.org "node-red home page"

[2]: https://www.npmjs.com/package/node-red-contrib-prib-functions "source code"

[3]: https://github.com/peterprib "base github"

[4]: https://github.com/NaturalIntelligence/fast-xml-parser "fast-xml-parser"

[5]: https://www.npmjs.com/package/snappy "snappy"

[6]: https://www.npmjs.com/package/avsc "avsc"

[7]: https://www.npmjs.com/package/xlsx "xlsx"

[8]: https://www.npmjs.com/package/dummy-json "dummy-json"
