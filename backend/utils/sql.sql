USE CSL;
DROP TABLE IF EXISTS surveyors_services;
CREATE TABLE surveyors_services (
    surveyor_id INT,
    subcategory_id INT,
    PRIMARY KEY (surveyor_id, subcategory_id),
    FOREIGN KEY (surveyor_id) REFERENCES surveyors(id),
    FOREIGN KEY (subcategory_id) REFERENCES service_subcategories(id)
);
INSERT INTO surveyors_services (surveyor_id, subcategory_id) VALUES
(21, 1),  -- Digital Buildings: BIM Consulting (Subcategory ID 1)
(21, 2),  -- Digital Buildings: BIM Consulting (Subcategory ID 1)
(21, 67), -- Surveying & Mapping: ALTA/NSPS Land Title Survey (Subcategory ID 67)
(21, 62); -- Real Estate Transactions Service: ALTA Survey (Subcategory ID 62)
-- SELECT
--     sc.name AS service_category_name,
--     ssc.name AS service_subcategory_name
-- FROM
--     surveyors_services ss
-- JOIN
--     service_subcategories ssc ON ss.subcategory_id = ssc.id
-- JOIN
--     service_categories sc ON ssc.category_id = sc.id
-- WHERE
--     ss.surveyor_id = 21
-- ORDER BY
--     sc.name, ssc.name;
